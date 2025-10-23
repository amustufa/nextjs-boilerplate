import { promises as fs } from 'fs';
import path from 'path';
import type { Storage, FileData, ListOptions, UrlOptions, StorageObject } from './types';

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

function baseDir(): string {
  return process.env.STORAGE_LOCAL_ROOT || path.join(process.cwd(), 'storage');
}

async function ensureDir(fp: string): Promise<void> {
  await fs.mkdir(path.dirname(fp), { recursive: true });
}

export function createLocalStorage(): Storage {
  const root = baseDir();
  const publicBase = process.env.STORAGE_PUBLIC_BASE_URL || '';
  return {
    async write(key, data, opts) {
      const bytes = await toUint8Array(data);
      const filePath = path.join(root, key);
      await ensureDir(filePath);
      await fs.writeFile(filePath, Buffer.from(bytes));
      const stat = await fs.stat(filePath);
      const meta: StorageObject = {
        key,
        size: stat.size,
        lastModified: stat.mtime,
        ...(opts?.contentType ? { contentType: opts.contentType } : {}),
        acl: opts?.acl ?? 'private',
        ...(opts?.metadata ? { metadata: opts.metadata } : {}),
      };
      return meta;
    },
    async read(key) {
      const filePath = path.join(root, key);
      const buf = await fs.readFile(filePath);
      return new Uint8Array(buf);
    },
    async delete(key) {
      const filePath = path.join(root, key);
      await fs.rm(filePath, { force: true });
    },
    async exists(key) {
      const filePath = path.join(root, key);
      try {
        await fs.stat(filePath);
        return true;
      } catch {
        return false;
      }
    },
    async list(prefix, opts?: ListOptions) {
      const dir = path.join(root, prefix);
      const out: string[] = [];
      async function walk(p: string): Promise<void> {
        const entries = await fs.readdir(p, { withFileTypes: true }).catch(() => []);
        for (const e of entries) {
          const full = path.join(p, e.name);
          if (e.isDirectory()) {
            if (opts?.recursive) await walk(full);
          } else {
            const rel = path.relative(root, full).replace(/\\/g, '/');
            out.push(rel);
          }
        }
      }
      await walk(dir);
      const limit = opts?.limit ?? out.length;
      const slice = out.slice(0, limit);
      const next = out.length > limit ? String(limit) : undefined;
      return { keys: slice, ...(next ? { nextCursor: next } : {}) };
    },
    async url(key, _opts?: UrlOptions) {
      if (!publicBase) return null;
      return `${publicBase.replace(/\/$/, '')}/${key}`;
    },
    async getMetadata(key) {
      const filePath = path.join(root, key);
      try {
        const stat = await fs.stat(filePath);
        return {
          key,
          size: stat.size,
          lastModified: stat.mtime,
        } as StorageObject;
      } catch {
        return null;
      }
    },
  };
}
