export interface FileRecord {
  id: string;
  key: string;
  bucket?: string | null;
  size: number;
  contentType: string;
  etag?: string | null;
  checksum?: string | null;
  lastModified?: Date | null;
  acl?: string | null;
  metadata: Record<string, unknown>;
  width?: number | null;
  height?: number | null;
  createdAt: Date;
  createdBy?: string | null;
}

export type FileMetaWithUrl = import('@/core/storage/types').StorageObject & { url: string | null };
export type FileKeyResult = { key: string };
