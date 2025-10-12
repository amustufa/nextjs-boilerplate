import type { Services } from '@/core/services';

export type SyncProfilePayload = { userId: string };
export const SYNC_PROFILE = 'users.sync_profile' as const;

export async function enqueueSyncProfile(
  services: Services,
  payload: SyncProfilePayload,
): Promise<void> {
  await services.queue.add(SYNC_PROFILE, payload, { attempts: 3 });
}

export function registerJobProcessors(services: Services): void {
  services.queue.process?.(SYNC_PROFILE, async (payload: SyncProfilePayload) => {
    services.logger.info({ payload }, 'Processing sync profile');
  });
}
