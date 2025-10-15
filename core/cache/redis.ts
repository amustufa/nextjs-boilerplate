import type { Cache } from '@/core/services';

type RedisClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: 'EX', ttlSec?: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

function connectRedis(): RedisClient {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

  // Try ioredis first, adapt to minimal interface
  try {
    // Use dynamic require but cast to minimal constructor signature to avoid any
    const IO = require('ioredis') as unknown as new (url: string) => {
      get(key: string): Promise<string | null>;
      set(key: string, value: string, ...rest: unknown[]): Promise<unknown>;
      del(key: string): Promise<unknown>;
    };
    const io = new IO(url);
    const client: RedisClient = {
      get: (k) => io.get(k),
      set: (k, v, mode, ttlSec) =>
        mode === 'EX' && ttlSec != null ? io.set(k, v, 'EX', ttlSec) : io.set(k, v),
      del: (k) => io.del(k),
    };
    return client;
  } catch {
    // Fallback to node-redis v4
    try {
      const { createClient } = require('redis') as unknown as {
        createClient: (opts: { url: string }) => {
          isOpen: boolean;
          connect(): Promise<void>;
          get(key: string): Promise<string | null>;
          set(key: string, value: string, opts?: { EX?: number }): Promise<unknown>;
          del(key: string): Promise<unknown>;
        };
      };
      const clientV4 = createClient({ url });
      if (!clientV4.isOpen) void clientV4.connect();
      const client: RedisClient = {
        get: (k) => clientV4.get(k),
        set: (k, v, mode, ttlSec) =>
          mode === 'EX' && ttlSec != null ? clientV4.set(k, v, { EX: ttlSec }) : clientV4.set(k, v),
        del: (k) => clientV4.del(k),
      };
      return client;
    } catch (e) {
      const err = e as Error;
      throw new Error(
        `No Redis client available. Install either 'ioredis' or 'redis'. Original: ${err.message}`,
      );
    }
  }
}

export function createRedisCache(): Cache {
  const client = connectRedis();
  return {
    async get<T>(k: string): Promise<T | null> {
      const raw = await client.get(k);
      if (raw == null) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },
    async set<T>(k: string, v: T, ttlSec?: number): Promise<void> {
      const s = JSON.stringify(v);
      if (ttlSec && ttlSec > 0) await client.set(k, s, 'EX', ttlSec);
      else await client.set(k, s);
    },
    async del(k: string): Promise<void> {
      await client.del(k);
    },
    async wrap<T>(k: string, ttlSec: number, fn: () => Promise<T>): Promise<T> {
      const cached = await this.get<T>(k);
      if (cached != null) return cached;
      const val = await fn();
      await this.set(k, val, ttlSec);
      return val;
    },
  };
}
