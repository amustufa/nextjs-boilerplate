import { describe, it, expect, vi } from 'vitest';
import { createJobsMemory } from '@/core/jobs/memory';

describe('jobs (memory)', () => {
  it('schedules one-off job and cancels by id', async () => {
    vi.useFakeTimers();
    const jobs = createJobsMemory();
    let ran = false;
    jobs.process('work', async () => {
      ran = true;
    });
    const { id } = await jobs.schedule('work', {}, { delayMs: 100 });
    const cancelled = await jobs.cancel({ id });
    expect(cancelled).toBe(1);
    vi.advanceTimersByTime(200);
    expect(ran).toBe(false);
    vi.useRealTimers();
  });

  it('repeats everyMs and cancel by name/idempotencyKey', async () => {
    vi.useFakeTimers();
    const jobs = createJobsMemory();
    let count = 0;
    jobs.process('tick', async () => {
      count += 1;
    });
    await jobs.schedule('tick', {}, { everyMs: 50, idempotencyKey: 'k' });
    vi.advanceTimersByTime(180);
    expect(count).toBeGreaterThanOrEqual(3);
    const cancelled = await jobs.cancel({ name: 'tick', idempotencyKey: 'k' });
    expect(cancelled).toBe(1);
    const prev = count;
    vi.advanceTimersByTime(200);
    expect(count).toBe(prev);
    vi.useRealTimers();
  });
});
