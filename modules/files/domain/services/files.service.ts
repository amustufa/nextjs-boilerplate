import type { Services } from '@/core/services';
import { buildKey } from '@/core/storage/types';
import { Prisma } from '@prisma/client';
import type { FileMetaWithUrl, FileKeyResult } from '../../types';

export type RequestUploadInput = {
  filename: string;
  contentType?: string;
  size?: number;
  ns?: string;
  acl?: 'public' | 'private';
};

export type RequestUploadResult =
  | {
      mode: 'presigned';
      key: string;
      url: string;
      headers?: Record<string, string>;
      expiresAt: string;
    }
  | { mode: 'server'; key: string };

export type ConfirmUploadInput = { key: string; size?: number; checksum?: string };
export type ConfirmUploadResult = { key: string };

export class FilesService {
  constructor(private services: Services) {}

  async requestUpload(input: RequestUploadInput): Promise<RequestUploadResult> {
    const ext = (() => {
      const i = input.filename.lastIndexOf('.');
      return i >= 0 ? input.filename.slice(i) : '';
    })();
    const key = buildKey({ ns: input.ns ?? 'uploads', ext });
    const presign = this.services.storage.createUploadUrl?.(key, {
      ...(input.contentType ? { contentType: input.contentType } : {}),
      acl: input.acl ?? 'private',
      metadata: { filename: input.filename },
      expiresSec: 300,
    });
    if (presign) {
      const u = await presign;
      return {
        mode: 'presigned',
        key,
        url: u.url,
        ...(u.headers ? { headers: u.headers } : {}),
        expiresAt: u.expiresAt.toISOString(),
      } as const;
    }
    return { mode: 'server', key };
  }

  async confirmUpload(_input: ConfirmUploadInput): Promise<ConfirmUploadResult> {
    const meta = await this.services.storage.getMetadata(_input.key);
    const bucket = process.env.STORAGE_S3_BUCKET || null;
    const contentType = meta?.contentType ?? 'application/octet-stream';
    const size = meta?.size ?? _input.size ?? 0;
    const etag = meta?.etag ?? null;
    const checksum = _input.checksum ?? null;
    const lastModified = meta?.lastModified ?? null;
    const acl = meta?.acl ?? null;
    const metadata = { ...(meta?.metadata ?? {}), confirmedAt: new Date().toISOString() } as Record<
      string,
      unknown
    >;

    const id = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) as string;
    await this.services.db.$executeRaw(
      Prisma.sql`INSERT INTO "File" (id, key, bucket, size, "contentType", etag, checksum, "lastModified", acl, metadata, "createdAt") VALUES (
        ${id}, ${_input.key}, ${bucket}, ${size}, ${contentType}, ${etag}, ${checksum}, ${lastModified}, ${acl}, ${metadata as Prisma.JsonObject}, ${new Date()}
      ) ON CONFLICT (key) DO UPDATE SET size = EXCLUDED.size, "contentType" = EXCLUDED."contentType", etag = EXCLUDED.etag, checksum = EXCLUDED.checksum, "lastModified" = EXCLUDED."lastModified", acl = EXCLUDED.acl, metadata = EXCLUDED.metadata`,
    );
    return { key: _input.key };
  }

  async writeBase64(
    ns: string,
    filename: string,
    base64: string,
    contentType?: string,
  ): Promise<FileKeyResult> {
    const ext = (() => {
      const i = filename.lastIndexOf('.');
      return i >= 0 ? filename.slice(i) : '';
    })();
    const key = buildKey({ ns, ext });
    const bytes = Buffer.from(base64, 'base64');
    const opts = { ...(contentType ? { contentType } : {}) };
    await this.services.storage.write(key, bytes, opts);
    return { key } as FileKeyResult;
  }

  async getByKey(key: string): Promise<FileMetaWithUrl | null> {
    const meta = await this.services.storage.getMetadata(key);
    if (!meta) return null;
    const url = await this.services.storage.url(key);
    return { ...meta, url } as FileMetaWithUrl;
  }
}
