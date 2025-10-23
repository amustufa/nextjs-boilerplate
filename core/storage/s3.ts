// S3 adapter using AWS SDK v3 with dynamic imports to avoid hard deps at compile time.
import type {
  Storage,
  FileData,
  WriteOptions,
  ListOptions,
  UrlOptions,
  StorageObject,
  UploadSession,
} from './types';

function isWebStream(x: unknown): x is ReadableStream<Uint8Array> {
  return typeof (x as ReadableStream<Uint8Array>).getReader === 'function';
}

function toUint8Array(data: FileData): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return Promise.resolve(data);
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(data))
    return Promise.resolve(new Uint8Array(data));
  if (isWebStream(data)) {
    const reader = data.getReader();
    const chunks: Uint8Array[] = [];
    return reader.read().then(async function accumulate(r): Promise<Uint8Array> {
      if (r.done) {
        const total = chunks.reduce((n, c) => n + c.byteLength, 0);
        const out = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) {
          out.set(c, offset);
          offset += c.byteLength;
        }
        return out;
      }
      chunks.push(r.value);
      return reader.read().then(accumulate);
    });
  }
  const it = data as AsyncIterable<Uint8Array>;
  const chunks: Uint8Array[] = [];
  return (async () => {
    for await (const c of it) chunks.push(c);
    const total = chunks.reduce((n, c) => n + c.byteLength, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.byteLength;
    }
    return out;
  })();
}

type S3Module = {
  S3Client: new (cfg: { region?: string }) => { send: (cmd: object) => Promise<unknown> };
  PutObjectCommand: new (input: Record<string, unknown>) => object;
  GetObjectCommand: new (input: Record<string, unknown>) => object;
  HeadObjectCommand: new (input: Record<string, unknown>) => object;
  DeleteObjectCommand: new (input: Record<string, unknown>) => object;
  ListObjectsV2Command: new (input: Record<string, unknown>) => object;
};

type Presigner = {
  getSignedUrl: (
    client: { send: (cmd: object) => Promise<unknown> },
    cmd: object,
    opts: { expiresIn: number },
  ) => Promise<string>;
};

export function createS3Storage(): Storage {
  // Dynamic import pattern to avoid hard dependency
  const mod = require('@aws-sdk/client-s3') as unknown as S3Module;
  const presigner = require('@aws-sdk/s3-request-presigner') as unknown as Presigner;
  const region = process.env.STORAGE_S3_REGION || process.env.AWS_REGION || 'us-east-1';
  const bucket = process.env.STORAGE_S3_BUCKET || '';
  const publicBase = process.env.STORAGE_PUBLIC_BASE_URL || '';
  const client: { send: (cmd: object) => Promise<unknown> } = new mod.S3Client({ region });

  return {
    async write(key, data, opts) {
      const body = await toUint8Array(data);
      const put = new mod.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(body),
        ContentType: opts?.contentType,
        CacheControl: opts?.cacheControl,
        ContentEncoding: opts?.contentEncoding,
        ContentDisposition: opts?.contentDisposition,
        Metadata: opts?.metadata,
        ACL: opts?.acl === 'public' ? 'public-read' : undefined,
      });
      await client.send(put);
      const head = new mod.HeadObjectCommand({ Bucket: bucket, Key: key });
      const metaRes = (await client.send(head).catch(() => undefined)) as
        | {
            ETag?: string;
            ContentLength?: number;
            ContentType?: string;
            LastModified?: string | Date;
          }
        | undefined;
      const etag = metaRes?.ETag?.replaceAll('"', '');
      const size = metaRes?.ContentLength ?? body.byteLength;
      const contentType = metaRes?.ContentType ?? opts?.contentType;
      const lastModified = metaRes?.LastModified ? new Date(metaRes.LastModified) : new Date();
      return {
        key,
        size,
        ...(etag ? { etag } : {}),
        lastModified,
        ...(contentType ? { contentType } : {}),
        acl: opts?.acl ?? 'private',
        ...(opts?.metadata ? { metadata: opts.metadata } : {}),
      } satisfies StorageObject;
    },
    async read(key) {
      const get = new mod.GetObjectCommand({ Bucket: bucket, Key: key });
      const res = (await client.send(get)) as { Body?: unknown };
      const stream = res.Body as unknown;
      if (isWebStream(stream)) {
        const reader = stream.getReader();
        const chunks: Uint8Array[] = [];
        let r = await reader.read();
        while (!r.done) {
          chunks.push(r.value);
          r = await reader.read();
        }
        const total = chunks.reduce((n, c) => n + c.byteLength, 0);
        const out = new Uint8Array(total);
        let offset = 0;
        for (const c of chunks) {
          out.set(c, offset);
          offset += c.byteLength;
        }
        return out;
      }
      const nodeStream = stream as NodeJS.ReadableStream;
      const buf = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        nodeStream
          .on('data', (c: Buffer) => chunks.push(c))
          .on('error', reject)
          .on('end', () => resolve(Buffer.concat(chunks)));
      });
      return new Uint8Array(buf);
    },
    async delete(key) {
      await client.send(new mod.DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
    async exists(key) {
      try {
        await client.send(new mod.HeadObjectCommand({ Bucket: bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    },
    async list(prefix, opts?: ListOptions) {
      const res = (await client.send(
        new mod.ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: opts?.limit ?? 1000,
        }),
      )) as {
        Contents?: { Key?: string }[];
        IsTruncated?: boolean;
        NextContinuationToken?: string;
      };
      const keys = (res.Contents ?? []).map((o) => String(o.Key)).filter(Boolean) as string[];
      const next =
        res.IsTruncated && res.NextContinuationToken ? res.NextContinuationToken : undefined;
      return { keys, ...(next ? { nextCursor: next } : {}) };
    },
    async url(key, opts?: UrlOptions) {
      if (publicBase) return `${publicBase.replace(/\/$/, '')}/${key}`;
      const cmd = new mod.GetObjectCommand({
        Bucket: bucket,
        Key: key,
        ResponseContentType: opts?.responseContentType,
        ResponseContentDisposition: opts?.downloadName
          ? `attachment; filename="${opts.downloadName}"`
          : undefined,
      });
      const expires = (opts?.expiresSec ?? 300) as number;
      return await presigner.getSignedUrl(client, cmd, { expiresIn: expires });
    },
    async getMetadata(key) {
      try {
        const r = (await client.send(new mod.HeadObjectCommand({ Bucket: bucket, Key: key }))) as {
          ContentLength?: number;
          LastModified?: string | Date;
          ContentType?: string;
          ETag?: string;
          Metadata?: Record<string, string>;
        };
        const obj = {
          key,
          size: r.ContentLength ?? 0,
          ...(r.LastModified ? { lastModified: new Date(r.LastModified) } : {}),
          ...(r.ContentType ? { contentType: String(r.ContentType) } : {}),
          ...(r.ETag ? { etag: String(r.ETag).replaceAll('"', '') } : {}),
          ...(r.Metadata ? ({ metadata: r.Metadata } as {}) : {}),
        } as StorageObject;
        return obj;
      } catch {
        return null;
      }
    },
    async createUploadUrl(
      key,
      opts?: WriteOptions & { expiresSec?: number },
    ): Promise<UploadSession> {
      const cmd = new mod.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: opts?.contentType,
        CacheControl: opts?.cacheControl,
        ContentEncoding: opts?.contentEncoding,
        ContentDisposition: opts?.contentDisposition,
        Metadata: opts?.metadata,
        ACL: opts?.acl === 'public' ? 'public-read' : undefined,
      });
      const expires = (opts?.expiresSec ?? 300) as number;
      const url = await presigner.getSignedUrl(client, cmd, { expiresIn: expires });
      return { key, url, expiresAt: new Date(Date.now() + expires * 1000) };
    },
  };
}
