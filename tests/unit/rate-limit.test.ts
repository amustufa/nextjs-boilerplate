import { describe, it, expect } from 'vitest';
import { limit, limitWithCache } from '@/core/http/rate-limit';
import { createCache as createMemoryCache } from '@/core/cache/adapter';

describe('rate-limit', () => {
  it('allows within capacity (in-memory)', () => {
    const key = `k:${Math.random()}`;
    const res1 = limit(key, { capacity: 2, refillPerSec: 100 });
    const res2 = limit(key, { capacity: 2, refillPerSec: 100 });
    const res3 = limit(key, { capacity: 2, refillPerSec: 100 });
    expect(res1.allowed).toBe(true);
    expect(res2.allowed).toBe(true);
    expect(res3.allowed).toBe(false);
  });

  it('works with cache-backed limiter', async () => {
    const cache = createMemoryCache();
    const key = `kc:${Math.random()}`;
    const r1 = await limitWithCache(cache, key, { capacity: 1, refillPerSec: 0 });
    const r2 = await limitWithCache(cache, key, { capacity: 1, refillPerSec: 0 });
    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(false);
    expect(r2.retryAfterSec).toBeGreaterThanOrEqual(1);
  });
});
