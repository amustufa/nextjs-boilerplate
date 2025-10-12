// Dev-only in-memory token bucket rate limiter (not for production/edge)
type Bucket = { tokens: number; updatedAt: number };
const store = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterSec?: number };

export function limit(
  key: string,
  opts: { capacity: number; refillPerSec: number },
): RateLimitResult {
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

// Cache-backed (distributed) token bucket using Services.cache (non-atomic, illustrative)
export async function limitWithCache(
  cache: {
    get<T>(k: string): Promise<T | null>;
    set<T>(k: string, v: T, ttlSec?: number): Promise<void>;
  },
  key: string,
  opts: { capacity: number; refillPerSec: number },
): Promise<RateLimitResult> {
  const now = Date.now();
  const state = (await cache.get<{ tokens: number; updatedAt: number }>(`rl:${key}`)) ?? {
    tokens: opts.capacity,
    updatedAt: now,
  };
  const elapsed = (now - state.updatedAt) / 1000;
  state.tokens = Math.min(opts.capacity, state.tokens + elapsed * opts.refillPerSec);
  state.updatedAt = now;
  if (state.tokens < 1) {
    const missing = 1 - state.tokens;
    const retryAfterSec = Math.ceil(missing / opts.refillPerSec);
    await cache.set(`rl:${key}`, state, 60);
    return { allowed: false, retryAfterSec };
  }
  state.tokens -= 1;
  await cache.set(`rl:${key}`, state, 60);
  return { allowed: true };
}

export type RateLimitPolicy = {
  key?: (args: { method: string; pathname: string; userId?: string; ip?: string }) => string;
  capacity: number;
  refillPerSec: number;
  useCache?: boolean;
};

let defaultPolicyByMethod: Partial<Record<string, RateLimitPolicy>> = {
  POST: { capacity: 10, refillPerSec: 1 },
  PUT: { capacity: 6, refillPerSec: 0.5 },
  PATCH: { capacity: 6, refillPerSec: 0.5 },
  DELETE: { capacity: 4, refillPerSec: 0.33 },
};

export function setDefaultRateLimitPolicy(map: Partial<Record<string, RateLimitPolicy>>): void {
  defaultPolicyByMethod = { ...defaultPolicyByMethod, ...map };
}

export function getDefaultRateLimitPolicy(method: string): RateLimitPolicy | undefined {
  return defaultPolicyByMethod[method.toUpperCase()];
}

export function defaultKeyBuilder(args: {
  method: string;
  pathname: string;
  userId?: string;
  ip?: string;
}): string {
  const base = `${args.method}:${args.pathname}`;
  const id = args.userId ?? args.ip ?? 'anonymous';
  return `${base}:${id}`;
}
