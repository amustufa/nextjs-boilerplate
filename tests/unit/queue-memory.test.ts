import { describe, it, expect } from 'vitest';
import { createQueue } from '@/core/queue/adapter';

describe('queue (memory)', () => {
  it('processes enqueued items', async () => {
    const q = createQueue();
    const seen: number[] = [];
    q.process?.('add', async (n: number) => {
      seen.push(n);
    });
    await q.add('add', 1);
    await q.add('add', 2);
    expect(seen).toEqual([1, 2]);
  });
});
