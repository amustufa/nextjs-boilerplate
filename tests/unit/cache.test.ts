import { describe, it, expect } from 'vitest';
import { createCache as createMemoryCache } from '@/core/cache/adapter';

describe('cache (memory adapter)', () => {
  it('set/get roundtrip', async () => {
    const cache = createMemoryCache();
    await cache.set('k', { a: 1 });
    await expect(cache.get<{ a: number }>('k')).resolves.toEqual({ a: 1 });
  });

  it('ttl stores when ttlSec=0 (no expiry)', async () => {
    const cache = createMemoryCache();
    await cache.set('e', 'x', 0);
    await expect(cache.get('e')).resolves.toBe('x');
  });

  it('wrap caches computed value', async () => {
    const cache = createMemoryCache();
    let n = 0;
    const v1 = await cache.wrap('w', 60, async () => {
      n += 1;
      return { v: 42 };
    });
    const v2 = await cache.wrap('w', 60, async () => {
      n += 1;
      return { v: 43 };
    });
    expect(v1).toEqual({ v: 42 });
    expect(v2).toEqual({ v: 42 });
    expect(n).toBe(1);
  });
});
