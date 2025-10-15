import type { Jobs } from '@/core/services';

type Handler = (payload: unknown) => Promise<void>;

export function createJobsMemory(): Jobs {
  const handlers = new Map<string, Handler>();
  const scheduledById = new Map<
    string,
    { name: string; idempotencyKey?: string | undefined; timer: NodeJS.Timeout; interval?: boolean }
  >();
  const indexByNameKey = new Map<string, string>(); // name::idempotencyKey -> id

  const makeKey = (name: string, idempotencyKey?: string) => `${name}::${idempotencyKey ?? ''}`;

  function scheduleInternal(
    name: string,
    payload: unknown,
    opts: {
      delayMs?: number;
      runAt?: Date;
      everyMs?: number;
      cron?: string;
      idempotencyKey?: string;
    },
  ): { id: string } {
    if (opts.cron) {
      // Simple memory adapter does not support cron parsing; emulate as everyMs no-op and warn.
      console.warn('[jobs:memory] cron is not supported; ignoring cron for name=%s', name);
    }
    const delay =
      typeof opts.delayMs === 'number'
        ? opts.delayMs
        : opts.runAt
          ? Math.max(0, opts.runAt.getTime() - Date.now())
          : 0;
    const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    const key = opts.idempotencyKey ? makeKey(name, opts.idempotencyKey) : undefined;
    if (key && indexByNameKey.has(key)) {
      // idempotent: return existing id
      return { id: indexByNameKey.get(key)! };
    }
    if (opts.everyMs && opts.everyMs > 0) {
      const timer = setInterval(async () => {
        const h = handlers.get(name);
        if (h) await h(payload);
      }, opts.everyMs);
      const rec = { name, idempotencyKey: opts.idempotencyKey, timer, interval: true as const };
      scheduledById.set(id, rec);
      if (key) indexByNameKey.set(key, id);
      return { id };
    }
    const timer = setTimeout(async () => {
      const h = handlers.get(name);
      if (h) await h(payload);
      // one-off completed: cleanup index and schedule map
      const rec = scheduledById.get(id);
      if (rec) {
        scheduledById.delete(id);
        if (rec.idempotencyKey) indexByNameKey.delete(makeKey(name, rec.idempotencyKey));
      }
    }, delay);
    const rec = { name, idempotencyKey: opts.idempotencyKey, timer };
    scheduledById.set(id, rec);
    if (key) indexByNameKey.set(key, id);
    return { id };
  }

  return {
    async schedule(name, payload, opts) {
      return scheduleInternal(name, payload, opts);
    },
    async cancel({ id, name, idempotencyKey }) {
      let cancelled = 0;
      if (id && scheduledById.has(id)) {
        const rec = scheduledById.get(id)!;
        if (rec.interval) clearInterval(rec.timer);
        else clearTimeout(rec.timer);
        scheduledById.delete(id);
        if (rec.idempotencyKey) indexByNameKey.delete(`${rec.name}::${rec.idempotencyKey}`);
        cancelled += 1;
      } else if (name && idempotencyKey) {
        const key = makeKey(name, idempotencyKey);
        const existing = indexByNameKey.get(key);
        if (existing) {
          const rec = scheduledById.get(existing);
          if (rec) {
            if (rec.interval) clearInterval(rec.timer);
            else clearTimeout(rec.timer);
            scheduledById.delete(existing);
          }
          indexByNameKey.delete(key);
          cancelled += 1;
        }
      }
      return cancelled;
    },
    process<T = unknown>(name: string, handler: (payload: T) => Promise<void>) {
      handlers.set(name, (p: unknown) => handler(p as T));
    },
  } satisfies Jobs;
}
