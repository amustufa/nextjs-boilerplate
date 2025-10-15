#!/usr/bin/env tsx
export {};
/* Cancel jobs by id or by (name, idempotencyKey). */

const argv = process.argv.slice(2);

function getArg(name: string): string | null {
  const i = argv.findIndex((a) => a === name || a.startsWith(name + '='));
  if (i === -1) return null;
  const v = argv[i];
  if (!v) return null;
  if (v.includes('=')) return (v.split('=')[1] ?? null) as string | null;
  return (argv[i + 1] ?? null) as string | null;
}

async function main() {
  const backend = (process.env.JOBS_BACKEND ?? 'memory').toLowerCase();
  const id = getArg('--id');
  const name = getArg('--name');
  const idempotencyKey = getArg('--idempotencyKey');
  const cron = getArg('--cron');
  const everyMsStr = getArg('--everyMs');
  const everyMs = everyMsStr ? Number(everyMsStr) : undefined;

  if (backend !== 'bullmq') {
    console.log('This helper supports BullMQ only. Set JOBS_BACKEND=bullmq.');
    process.exit(0);
  }
  type BullQueue = {
    remove(id: string): Promise<void>;
    removeRepeatable(
      name: string,
      repeat: { cron?: string; every?: number | undefined },
      jobId: string,
    ): Promise<void>;
    getRepeatableJobs(): Promise<Array<{ key?: string }>>;
    removeRepeatableByKey(key: string): Promise<void>;
    close(): Promise<void>;
  };
  const { Queue } = require('bullmq') as unknown as {
    Queue: new (name: string, opts: { connection: { url: string } }) => BullQueue;
  };
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  const qName = process.env.JOBS_QUEUE_NAME ?? 'app:jobs';
  const q = new Queue(qName, { connection: { url } });

  let removed = 0;
  if (id) {
    try {
      await q.remove(id);
      removed += 1;
      console.log(`Removed job id=${id}`);
    } catch (e) {
      console.warn(`Could not remove id=${id}: ${(e as Error).message}`);
    }
  }
  if (name && idempotencyKey && (cron || everyMs)) {
    const repeat = cron ? { cron } : { every: everyMs };
    try {
      await q.removeRepeatable(name, repeat, `${name}::${idempotencyKey}`);
      removed += 1;
      console.log(`Removed repeatable name=${name} key=${idempotencyKey}`);
    } catch (e) {
      console.warn(`Could not remove repeatable: ${(e as Error).message}`);
    }
  } else if (name && idempotencyKey) {
    const reps = await q.getRepeatableJobs();
    for (const r of reps) {
      const key: string = r.key ?? '';
      if (key.includes(`:${name}:`) && key.includes(idempotencyKey)) {
        await q.removeRepeatableByKey(key);
        removed += 1;
        console.log(`Removed repeatable name=${name} key=${idempotencyKey}`);
      }
    }
  }
  await q.close();
  console.log(JSON.stringify({ removed }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
