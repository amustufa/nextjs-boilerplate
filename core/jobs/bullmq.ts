import type { Jobs } from '@/core/services';
import { getSharedQueue, registerHandler } from '@/core/jobs/bullmq-shared';

export function createJobsBullMQ(): Jobs {
  return {
    async schedule(name, payload, opts) {
      const q = getSharedQueue();
      const repeat = opts.cron
        ? { cron: opts.cron }
        : opts.everyMs
          ? { every: opts.everyMs }
          : undefined;
      const delay =
        typeof opts.delayMs === 'number'
          ? opts.delayMs
          : opts.runAt
            ? Math.max(0, opts.runAt.getTime() - Date.now())
            : 0;
      const jobId = opts.idempotencyKey ? `${name}::${opts.idempotencyKey}` : undefined;
      const addOpts: {
        delay?: number;
        repeat?: { cron?: string; every?: number };
        jobId?: string;
      } = { delay };
      if (jobId) addOpts.jobId = jobId;
      if (repeat) addOpts.repeat = repeat;
      const job = await q.add(name, payload, addOpts);
      return { id: String(job.id) };
    },
    async cancel({ id, name, idempotencyKey, cron, everyMs }) {
      let n = 0;
      const q = getSharedQueue();
      if (id) {
        try {
          await q.remove(id);
          n += 1;
        } catch {
          // ignore if not found
        }
      }
      if (name && idempotencyKey && (cron || everyMs)) {
        // Deterministic removal when schedule parameters are provided
        const repeat = cron ? { cron } : { every: everyMs as number };
        try {
          await q.removeRepeatable(name, repeat, `${name}::${idempotencyKey}`);
          n += 1;
        } catch {
          // ignore if not found
        }
      } else if (name && idempotencyKey) {
        try {
          const reps = await q.getRepeatableJobs();
          for (const r of reps) {
            const key: string = r.key ?? '';
            if (key.includes(`:${name}:`) && key.includes(idempotencyKey)) {
              await q.removeRepeatableByKey(key);
              n += 1;
            }
          }
        } catch {
          // ignore if not supported
        }
      }
      return n;
    },
    process(name, handler) {
      registerHandler(name, handler as (p: unknown) => Promise<void>);
    },
  } satisfies Jobs;
}
