type ConnectionOpts = { connection: { url: string } };

type BullQueue = {
  add(
    name: string,
    payload: unknown,
    opts: {
      delay?: number;
      repeat?: { cron?: string; every?: number };
      jobId?: string;
      attempts?: number;
    },
  ): Promise<{ id: string | number | undefined }>;
  remove(id: string): Promise<void>;
  removeRepeatable(
    name: string,
    repeat: { cron?: string; every?: number },
    jobId: string,
  ): Promise<void>;
  getRepeatableJobs(): Promise<Array<{ key?: string }>>;
  removeRepeatableByKey(key: string): Promise<void>;
};

type Job = { name: string; data: unknown };

type BullMQModule = {
  Queue: new (name: string, opts: ConnectionOpts) => BullQueue;
  Worker: new (
    name: string,
    processor: (job: Job) => Promise<void>,
    opts: ConnectionOpts,
  ) => unknown;
};

let _queue: BullQueue | null = null;
let _worker: unknown | null = null;
const _handlers = new Map<string, (payload: unknown) => Promise<void>>();

export function loadBullMQ(): BullMQModule {
  try {
    return require('bullmq') as unknown as BullMQModule;
  } catch (e) {
    const err = e as Error;
    throw new Error(`BullMQ not installed. Install 'bullmq'. Original: ${err.message}`);
  }
}

function getConnection(): ConnectionOpts['connection'] {
  const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
  return { url };
}

export function getSharedQueue(): BullQueue {
  if (_queue) return _queue;
  const { Queue } = loadBullMQ();
  const name = process.env.JOBS_QUEUE_NAME ?? 'app:jobs';
  _queue = new Queue(name, { connection: getConnection() });
  return _queue;
}

export function ensureSharedWorker(): void {
  if (_worker) return;
  const { Worker } = loadBullMQ();
  const qName = process.env.JOBS_QUEUE_NAME ?? 'app:jobs';
  _worker = new Worker(
    qName,
    async (job: Job) => {
      const fn = _handlers.get(job.name);
      if (fn) await fn(job.data);
    },
    { connection: getConnection() },
  );
}

export function registerHandler(name: string, handler: (payload: unknown) => Promise<void>): void {
  _handlers.set(name, handler);
  ensureSharedWorker();
}
