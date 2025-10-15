import { describe, it, expect } from 'vitest';
import { createMemoryLock } from '@/core/lock/memory';

describe('lock (memory)', () => {
  it('acquire and release', async () => {
    const lock = createMemoryLock();
    const a = await lock.acquire('k', 1000);
    expect(a.ok).toBe(true);
    const b = await lock.acquire('k', 1000);
    expect(b.ok).toBe(false);
    if (a.ok) await lock.release('k', a.token);
    const c = await lock.acquire('k', 1000);
    expect(c.ok).toBe(true);
  });
});
