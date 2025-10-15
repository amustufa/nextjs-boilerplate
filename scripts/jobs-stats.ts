#!/usr/bin/env tsx
export {};
/*
  Prints job stats for the configured backend.
  Usage:
    pnpm jobs:stats --queues users.sync_profile,another.queue
  Env:
    JOBS_BACKEND=memory|bullmq
    REDIS_URL=redis://...
*/

const argv = process.argv.slice(2);
const queuesArg = findArg('--queues');
const queues = queuesArg
  ? queuesArg
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [];

function findArg(name: string): string | null {
  const i = argv.findIndex((a) => a === name || a.startsWith(name + '='));
  if (i === -1) return null;
  const v = argv[i];
  if (!v) return null;
  if (v.includes('=')) return (v.split('=')[1] ?? null) as string | null;
  return (argv[i + 1] ?? null) as string | null;
}

async function main() {
  const backend = (process.env.JOBS_BACKEND ?? 'memory').toLowerCase();
  if (backend === 'memory') {
    console.log('JOBS_BACKEND=memory: in-memory adapter has no global stats.');
    console.log('Tip: run this in the same process and expose stats, or switch to BullMQ.');
    return;
  }
  if (backend === 'bullmq') {
    if (!queues.length) {
      console.error('Provide --queues comma-separated list of queue names to inspect.');
      process.exit(1);
    }
    type JobCounts = Record<string, number>;
    type BullQueue = {
      getJobCounts: (...types: string[]) => Promise<JobCounts>;
      close(): Promise<void>;
    };
    const { Queue } = require('bullmq') as unknown as {
      Queue: new (name: string, opts: { connection: { url: string } }) => BullQueue;
    };
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    const connection = { url };
    for (const name of queues) {
      const q = new Queue(name, { connection });
      const counts = await q.getJobCounts(
        'waiting',
        'active',
        'delayed',
        'completed',
        'failed',
        'paused',
        'waiting-children',
      );
      console.log(JSON.stringify({ queue: name, counts }, null, 2));
      await q.close();
    }
    return;
  }
  console.error(`Unsupported JOBS_BACKEND: ${backend}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
