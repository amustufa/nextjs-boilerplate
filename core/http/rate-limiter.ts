// Skeleton interface for a pluggable, distributed, atomic rate limiter (e.g., Redis/Lua)
// Intentionally no implementation here — adapters (Redis, Upstash, etc.) can implement this
// and be wired into HttpRequest in place of the demo cache/in-memory limiter.

export type RateLimitOutcome = {
  allowed: boolean;
  retryAfterSec?: number;
};

export type SlidingWindowOpts = {
  capacity: number; // max tokens in the window
  refillPerSec: number; // token refill rate per second
};

export type RateLimitContext = {
  key: string; // final limiter key (includes method/path/user/ip as desired)
  window: SlidingWindowOpts;
};

export interface RateLimiter {
  // Atomically consume 1 token for the provided key/window and return the decision
  // Implementers should use atomic operations (e.g., Redis Lua) to avoid race conditions.
  consume(ctx: RateLimitContext): Promise<RateLimitOutcome>;

  // Optional: manually reset/clear a key's limiter state
  reset?(key: string): Promise<void>;
}

// Example factory signature for adapters (not implemented here):
// export type CreateRateLimiter = (opts: { client: unknown }) => RateLimiter;
