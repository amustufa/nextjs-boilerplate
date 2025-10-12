import type { Cache } from '@/core/services';

export function createCache(): Cache {
  const store = new Map<string, { v: unknown; exp: number | null }>();
  const now = () => Date.now();
  const get = async <T>(k: string): Promise<T | null> => {
    const e = store.get(k);
    if (!e) return null;
    if (e.exp && e.exp < now()) {
      store.delete(k);
      return null;
    }
    return e.v as T;
  };
  const set = async <T>(k: string, v: T, ttlSec?: number) => {
    const exp = ttlSec ? now() + ttlSec * 1000 : null;
    store.set(k, { v, exp });
  };
  const del = async (k: string) => {
    store.delete(k);
  };
  const wrap = async <T>(k: string, ttlSec: number, fn: () => Promise<T>) => {
    const cached = await get<T>(k);
    if (cached != null) return cached;
    const val = await fn();
    await set(k, val, ttlSec);
    return val;
  };
  return { get, set, del, wrap };
}
