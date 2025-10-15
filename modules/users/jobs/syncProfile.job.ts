import type { Services } from '@/core/services';

export type SyncProfilePayload = { userId: string };
export const SYNC_PROFILE = 'users.sync_profile' as const;

export async function enqueueSyncProfile(
  services: Services,
  payload: SyncProfilePayload,
): Promise<void> {
  // Idempotent enqueue with queue adapter (BullMQ maps to jobId)
  await services.queue.add(SYNC_PROFILE, payload, {
    attempts: 3,
    idempotencyKey: `user:${payload.userId}`,
  });
}

export function registerJobProcessors(services: Services): void {
  const handler = async (payload: SyncProfilePayload) => {
    services.logger.info({ payload }, 'Processing sync profile');
  };
  services.queue.process?.(SYNC_PROFILE, handler);
  services.jobs?.process(SYNC_PROFILE, handler);
}

// Example: schedule recurring sync using jobs adapter (disabled by default, opt-in via env)
export async function registerExampleScheduler(services: Services): Promise<void> {
  if (process.env.EXAMPLE_SCHEDULER_ENABLED !== 'true') return;
  // Acquire a short lock to avoid multiple instances scheduling the same repeat
  const lock = services.lock;
  if (!lock) return;
  const key = 'scheduler:users.sync_profile';
  const ttlMs = 10_000; // small TTL just to coordinate schedulers at boot
  const res = await lock.acquire(key, ttlMs);
  if (!res.ok) return;
  try {
    await services.jobs?.schedule(
      SYNC_PROFILE,
      { userId: 'demo' },
      { everyMs: 60_000, idempotencyKey: 'repeat::demo' },
    );
  } finally {
    await lock.release(key, res.token);
  }
}
