import type {
  Storage,
  StorageKey,
  FileData,
  WriteOptions,
  ListOptions,
  UrlOptions,
  StorageObject,
  UploadSession,
} from './types';

type Entry = {
  data: Uint8Array;
  meta: StorageObject;
};

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

export function createMemoryStorage(): Storage {
  const map = new Map<StorageKey, Entry>();
  return {
    async write(key, data, opts) {
      const bytes = await toUint8Array(data);
      const etag = `${bytes.byteLength.toString(16)}-${(bytes[0] ?? 0).toString(16)}`;
      const now = new Date();
      const meta: StorageObject = {
        key,
        size: bytes.byteLength,
        etag,
        lastModified: now,
        ...(opts?.contentType ? { contentType: opts.contentType } : {}),
        acl: opts?.acl ?? 'private',
        ...(opts?.metadata ? { metadata: opts.metadata } : {}),
      };
      map.set(key, { data: bytes, meta });
      return meta;
    },
    async read(key) {
      const e = map.get(key);
      if (!e) throw new Error('not_found');
      return e.data;
    },
    async delete(key) {
      map.delete(key);
    },
    async exists(key) {
      return map.has(key);
    },
    async list(prefix, opts?: ListOptions) {
      const keys = Array.from(map.keys()).filter((k) => k.startsWith(prefix));
      const limit = opts?.limit ?? keys.length;
      const slice = keys.slice(0, limit);
      const next = keys.length > limit ? String(limit) : undefined;
      return { keys: slice, ...(next ? { nextCursor: next } : {}) };
    },
    async url(key, _opts?: UrlOptions) {
      const e = map.get(key);
      if (!e) return null;
      if (e.meta.acl === 'public') return `memory://${encodeURIComponent(key)}`;
      return null;
    },
    async getMetadata(key) {
      const e = map.get(key);
      return e?.meta ?? null;
    },
    async createUploadUrl(
      key,
      opts?: WriteOptions & { expiresSec?: number },
    ): Promise<UploadSession> {
      // Memory adapter does not support real presigning; return a sentinel URL indicating server-proxy should be used.
      const ttl = opts?.expiresSec ?? 300;
      const expiresAt = new Date(Date.now() + ttl * 1000);
      return { key, url: `memory+upload://${encodeURIComponent(key)}`, expiresAt };
    },
  };
}
