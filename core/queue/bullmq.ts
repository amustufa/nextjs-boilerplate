import type { Queue as QueueContract } from '@/core/services';
import { getSharedQueue, registerHandler } from '@/core/jobs/bullmq-shared';

export function createQueueBullMQ(): QueueContract {
  return {
    async add(name, payload, opts) {
      const q = getSharedQueue();
      const addOpts: { delay?: number; attempts?: number; jobId?: string } = {
        delay: opts?.delayMs ?? 0,
        attempts: opts?.attempts ?? 1,
      };
      if (opts?.idempotencyKey) addOpts.jobId = `${name}::${opts.idempotencyKey}`;
      await q.add(
        name,
        payload,
        addOpts as {
          delay?: number;
          repeat?: { cron?: string; every?: number };
          jobId?: string;
          attempts?: number;
        },
      );
    },
    process(name, handler) {
      registerHandler(name, handler as (p: unknown) => Promise<void>);
    },
  } as QueueContract;
}
