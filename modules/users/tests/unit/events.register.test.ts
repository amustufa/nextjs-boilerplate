import { describe, it, expect, vi } from 'vitest';
import { registerUserEvents } from '@/modules/users/events/onUserCreated';
import { USER_CREATED, type UserCreatedPayload } from '@/modules/users/interfaces/events';
import { createEventsBus } from '@/core/events/adapter';

describe('users events registration', () => {
  it('registers handler that logs when user is created', async () => {
    const events = createEventsBus();
    const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    const services = {
      events,
      logger,
    } as unknown as import('@/core/services').Services;

    registerUserEvents(services);

    const payload: UserCreatedPayload = { id: 'u1', email: 'u1@example.com' };
    events.emit(USER_CREATED, payload);
    // allow microtasks to run handlers
    await Promise.resolve();
    expect(logger.info).toHaveBeenCalled();
  });
});
