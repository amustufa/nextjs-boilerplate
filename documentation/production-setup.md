# Production Setup

This guide summarizes recommended settings when deploying with Redis/BullMQ or SQS.

## Redis + BullMQ

- Redis: provision a managed Redis (with persistence for reliability). Use `REDIS_URL`.
- Queue/Jobs backends:
  - `QUEUE_BACKEND=bullmq`
  - `JOBS_BACKEND=bullmq`
  - `JOBS_QUEUE_NAME=app:jobs` (or a custom name)
- Idempotency:
  - Pass `idempotencyKey` to `queue.add` and `jobs.schedule` to dedupe.
  - Use DB/Redis guards for handler‑level idempotency.
- Repeatable jobs:
  - Use `cron` or `everyMs`; cancel deterministically via `jobs.cancel({ name, idempotencyKey, cron|everyMs })`.
- Observability:
  - Use `pnpm jobs:stats --queues <jobNames>` for quick counts.
  - Consider Bull Board or custom dashboards for deeper visibility.
- Scaling:
  - Multiple app instances register the same workers; BullMQ will distribute work via Redis.

## SQS

- Prereqs: `@aws-sdk/client-sqs`, AWS credentials (env/role) with SQS access.
- Jobs backend: `JOBS_BACKEND=sqs`, `AWS_REGION`, `SQS_QUEUE_URL`.
- FIFO queues:
  - Set `SQS_FIFO=true` and use an `.fifo` queue URL. Optionally set `SQS_MESSAGE_GROUP_ID`.
  - Ordering is guaranteed per group; the adapter enforces concurrency=1 for FIFO.
- Concurrency & Long jobs:
  - `SQS_CONCURRENCY` sets parallel handling for standard queues.
  - `SQS_HEARTBEAT_SEC` and `SQS_EXTEND_BY_SEC` control visibility heartbeat extension for long handlers.
- Delays & Repeats:
  - SQS supports up to 15 minutes delay. For repeats/cron, use EventBridge Scheduler to call an API that enqueues work.
  - Cancel of enqueued messages is not supported natively by SQS.
- DLQ:
  - Configure maxReceiveCount and a DLQ on the queue for resilience.
- Observability:
  - `pnpm jobs:stats:sqs` prints approximate visible/invisible/delayed counts.

## Locking

- Use `LOCK_BACKEND=redis` with `REDIS_URL` to coordinate singleton schedulers or critical sections.
- Pattern: acquire → do work → release; always release in a finally block.

## Security

- Store secrets in platform secrets manager (not in code).
- Limit IAM permissions to the specific queues.
