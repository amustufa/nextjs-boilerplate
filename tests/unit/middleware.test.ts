import { describe, it, expect } from 'vitest';
import { unauthorized, forbid, notFound, tooManyRequests } from '@/core/http/middleware';

describe('middleware helpers', () => {
  it('returns correct statuses', async () => {
    expect((await unauthorized().json()).ok).toBe(false);
    expect(unauthorized().status).toBe(401);
    expect(forbid().status).toBe(403);
    expect(notFound().status).toBe(404);
    const r = tooManyRequests(3);
    expect(r.status).toBe(429);
    expect(r.headers.get('Retry-After')).toBe('3');
  });
});
