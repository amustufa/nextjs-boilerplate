import { describe, it, expect } from 'vitest';
import { createEventsBus } from '@/core/events/adapter';

describe('events bus', () => {
  it('emits and handles events', async () => {
    const bus = createEventsBus();
    const seen: string[] = [];
    bus.on<string>('x', async (p) => {
      seen.push(p);
    });
    bus.emit('x', 'a');
    bus.emit('x', 'b');
    // EventEmitter handlers run sync by default; ensure queued microtasks finish
    await Promise.resolve();
    expect(seen).toEqual(['a', 'b']);
  });
});
