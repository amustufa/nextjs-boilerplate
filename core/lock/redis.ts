import type { Lock } from '@/core/services';

type RedisClient = {
  set(key: string, value: string, mode: 'PX' | 'EX', ttl: number, flag: 'NX'): Promise<'OK' | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
};

function connectRedis(): RedisClient {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  // Try ioredis first
  try {
    const IO = require('ioredis') as unknown as new (url: string) => {
      set(k: string, v: string, mode: 'PX' | 'EX', ttl: number, flag: 'NX'): Promise<'OK' | null>;
      get(k: string): Promise<string | null>;
      del(k: string): Promise<number> | Promise<unknown>;
    };
    const io = new IO(url);
    const client: RedisClient = {
      set: (k, v, mode, ttl, flag) => io.set(k, v, mode, ttl, flag),
      get: (k) => io.get(k),
      del: async (k) => Number(await io.del(k)),
    };
    return client;
  } catch {
    // Fallback to node-redis v4
    const { createClient } = require('redis') as unknown as {
      createClient: (opts: { url: string }) => {
        isOpen: boolean;
        connect(): Promise<void>;
        get(k: string): Promise<string | null>;
        set(
          k: string,
          v: string,
          opts: { PX?: number; EX?: number; NX?: boolean },
        ): Promise<string | null>;
        del(k: string): Promise<number>;
      };
    };
    const clientV4 = createClient({ url });
    if (!clientV4.isOpen) void clientV4.connect();
    const client: RedisClient = {
      set: async (k, v, mode, ttl, flag) => {
        const res = await clientV4.set(k, v, { [mode]: ttl, NX: flag === 'NX' });
        return res === 'OK' ? 'OK' : null;
      },
      get: (k) => clientV4.get(k),
      del: (k) => clientV4.del(k),
    };
    return client;
  }
}

export function createRedisLock(): Lock {
  const client = connectRedis();
  return {
    async acquire(key, ttlMs) {
      const token = Math.random().toString(36).slice(2);
      const res = await client.set(key, token, 'PX', ttlMs, 'NX');
      if (res === 'OK') return { ok: true as const, token };
      return { ok: false as const };
    },
    async release(key, token) {
      // Best-effort compare-and-delete (not atomic without Lua)
      const v = await client.get(key);
      if (v === token) await client.del(key);
    },
  };
}
