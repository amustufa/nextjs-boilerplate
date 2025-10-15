# Providers and Examples

This boilerplate hides infra behind provider-agnostic adapters. Developers only use `services.*` contracts.

## Selecting Providers

- Set env vars; modules don’t change:
  - `CACHE_BACKEND=memory|redis`
  - `QUEUE_BACKEND=memory|bullmq`
  - `JOBS_BACKEND=memory|bullmq|sqs`
  - `LOCK_BACKEND=memory|redis`
  - Common: `REDIS_URL`, `JOBS_QUEUE_NAME`, `AWS_REGION`, `SQS_QUEUE_URL`, `SQS_FIFO`, `SQS_MESSAGE_GROUP_ID`

## APIs

- Cache: `get/set/del/wrap`
- Queue: `add(name, payload, { attempts?, delayMs?, idempotencyKey? })`, `process(name, handler)`
- Jobs: `schedule(name, payload, { runAt|delayMs|everyMs|cron, idempotencyKey? })`, `cancel({ id?, name?, idempotencyKey?, cron?, everyMs? })`, `process(name, handler)`
- Lock: `acquire(key, ttlMs) → { ok, token? }`, `release(key, token)`

## Users Module Examples

### Enqueue Job (Idempotent)

```ts
await services.queue.add(
  'users.sync_profile',
  { userId },
  {
    attempts: 3,
    idempotencyKey: `user:${userId}`,
  },
);
```

### Process Job

```ts
services.queue.process?.('users.sync_profile', async ({ userId }) => {
  await services.logger.info({ userId }, 'Processing sync profile');
});
```

### Schedule Recurring Job (opt-in)

Enable with `EXAMPLE_SCHEDULER_ENABLED=true`.

```ts
await services.jobs?.schedule(
  'users.sync_profile',
  { userId: 'demo' },
  {
    everyMs: 60_000,
    idempotencyKey: 'repeat::demo',
  },
);
```

### Lock for Singleton Scheduling

```ts
const res = await services.lock!.acquire('scheduler:users.sync_profile', 10_000);
if (res.ok) {
  try {
    /* schedule work */
  } finally {
    await services.lock!.release('scheduler:users.sync_profile', res.token);
  }
}
```

## Backends: Behavior Notes

- BullMQ (Redis): supports repeats (cron/every), delays, attempts, and idempotency via `jobId`.
- SQS: supports one-off delays up to 15 minutes. No cancel of scheduled messages; repeats require EventBridge Scheduler.
- Memory: good for dev; not distributed; repeats and idempotency work within process.

## CLI

- Stats (BullMQ): `pnpm jobs:stats --queues users.sync_profile`
- Cancel (BullMQ):
  - `pnpm jobs:cancel --id <jobId>`
  - `pnpm jobs:cancel --name users.sync_profile --idempotencyKey key123 --cron "*/5 * * * *"`
  - `pnpm jobs:cancel --name users.sync_profile --idempotencyKey key123 --everyMs 60000`
