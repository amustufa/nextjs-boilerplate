// Dev-only in-memory token bucket rate limiter (not for production/edge)
type Bucket = { tokens: number; updatedAt: number };
const store = new Map<string, Bucket>();

export function limit(
  key: string,
  opts: { capacity: number; refillPerSec: number },
): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now();
  const b = store.get(key) ?? { tokens: opts.capacity, updatedAt: now };
  const elapsed = (now - b.updatedAt) / 1000;
  b.tokens = Math.min(opts.capacity, b.tokens + elapsed * opts.refillPerSec);
  b.updatedAt = now;
  if (b.tokens < 1) {
    const missing = 1 - b.tokens;
    const retryAfterSec = Math.ceil(missing / opts.refillPerSec);
    store.set(key, b);
    return { allowed: false, retryAfterSec };
  }
  b.tokens -= 1;
  store.set(key, b);
  return { allowed: true };
}
