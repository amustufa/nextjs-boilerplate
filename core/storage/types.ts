export type StorageKey = string;

export type WriteOptions = {
  contentType?: string;
  cacheControl?: string;
  contentEncoding?: string;
  contentDisposition?: string;
  metadata?: Record<string, string>;
  acl?: 'public' | 'private';
};

export type UrlOptions = {
  expiresSec?: number;
  responseContentType?: string;
  downloadName?: string;
};

export type ListOptions = {
  recursive?: boolean;
  limit?: number;
  cursor?: string;
};

export type StorageObject = {
  key: StorageKey;
  size: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
  acl?: 'public' | 'private';
};

export type UploadSession = {
  key: StorageKey;
  url: string;
  headers?: Record<string, string>;
  expiresAt: Date;
};

export type FileData = Uint8Array | Buffer | AsyncIterable<Uint8Array> | ReadableStream<Uint8Array>;

export interface Storage {
  write(key: StorageKey, data: FileData, opts?: WriteOptions): Promise<StorageObject>;
  read(key: StorageKey): Promise<Uint8Array>;
  delete(key: StorageKey): Promise<void>;
  exists(key: StorageKey): Promise<boolean>;
  list(prefix: string, opts?: ListOptions): Promise<{ keys: StorageKey[]; nextCursor?: string }>;
  url(key: StorageKey, opts?: UrlOptions): Promise<string | null>;
  getMetadata(key: StorageKey): Promise<StorageObject | null>;
  createUploadUrl?(
    key: StorageKey,
    opts?: WriteOptions & { expiresSec?: number },
  ): Promise<UploadSession>;
}

export function buildKey(args: { ns: string; ext?: string; date?: Date; id?: string }): string {
  const d = args.date ?? new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const id = args.id ?? globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  const ext = args.ext ? (args.ext.startsWith('.') ? args.ext : `.${args.ext}`) : '';
  return `${args.ns}/${yyyy}/${mm}/${dd}/${id}${ext}`;
}
