import type { Queue } from '@/core/services';

export function createQueue(): Queue {
  const handlers = new Map<string, (payload: unknown) => Promise<void>>();
  const pending: { name: string; payload: unknown }[] = [];
  let pumping = false;
  async function pump() {
    if (pumping) return;
    pumping = true;
    while (pending.length) {
      const job = pending.shift()!;
      const h = handlers.get(job.name);
      if (h) await h(job.payload);
    }
    pumping = false;
  }
  return {
    async add(name: string, payload: unknown) {
      pending.push({ name, payload });
      await pump();
    },
    process<T = unknown>(name: string, handler: (payload: T) => Promise<void>) {
      handlers.set(name, (payload: unknown) => handler(payload as T));
    },
  };
}
