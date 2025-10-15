import type { Lock } from '@/core/services';

type Entry = { token: string; exp: number };

export function createMemoryLock(): Lock {
  const store = new Map<string, Entry>();
  function now() {
    return Date.now();
  }
  function purge(k: string) {
    const e = store.get(k);
    if (e && e.exp <= now()) store.delete(k);
  }
  return {
    async acquire(key, ttlMs) {
      purge(key);
      if (store.has(key)) return { ok: false as const };
      const token = Math.random().toString(36).slice(2);
      store.set(key, { token, exp: now() + ttlMs });
      return { ok: true as const, token };
    },
    async release(key, token) {
      const e = store.get(key);
      if (e && e.token === token) store.delete(key);
    },
  };
}
