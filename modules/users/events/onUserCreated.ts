import type { Services } from '@/core/services';
import { USER_CREATED, type UserCreatedPayload } from '@/modules/users/interfaces/events';

export function registerUserEvents(services: Services): void {
  services.events.on<UserCreatedPayload>(USER_CREATED, async (p) => {
    // TODO: implement cache invalidation strategy (tags/versioning) for users:list
    // Placeholder: no-op invalidation for now
    services.logger.info({ userId: p.id }, 'User created event handled');
  });
}
