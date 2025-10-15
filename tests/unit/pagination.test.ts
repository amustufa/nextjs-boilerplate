import { describe, it, expect } from 'vitest';
import { pageMeta } from '@/core/http/pagination';

describe('pagination', () => {
  it('computes totalPages and meta', () => {
    const m = pageMeta(2, 10, 35);
    expect(m.totalPages).toBe(4);
    expect(m.page).toBe(2);
    expect(m.perPage).toBe(10);
  });
});
