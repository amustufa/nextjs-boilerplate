import { describe, it, expect } from 'vitest';
import { ok, fail } from '@/core/http/response';

describe('response helpers', () => {
  it('ok envelope', () => {
    const res = ok({ x: 1 }, { durationMs: 5 });
    expect(res.ok).toBe(true);
    expect(res.data).toEqual({ x: 1 });
    expect(res.meta?.durationMs).toBe(5);
  });
  it('fail envelope', () => {
    const res = fail({ type: 'auth', code: 'X', message: 'no', details: null });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe('X');
  });
});
