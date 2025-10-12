# Events, Jobs, Cache

- Events (durable, at-least-once): Use an Outbox pattern for consistency; handlers must be idempotent.
- Jobs/Queue (retries + DLQ): Provide retry/backoff and dead-letter handling; use dedupe keys for idempotency.
- Event/Job naming: Events use `module.resource.event` (e.g., `users.user.created`); Jobs use `module.jobName`.
- Cache: `core/cache` abstraction with Redis/KV adapters; invalidation is event-driven.

```ts
// core/events/bus.ts
import { EventEmitter } from 'node:events';
export type AppEvent = { type: string; payload: unknown };
export class EventBus extends EventEmitter {
  emitEvent(e: AppEvent) {
    this.emit(e.type, e.payload);
  }
}
```

## Module-level Events and Jobs

- Location: Each module defines its events in `modules/<module>/events/*` and jobs in `modules/<module>/jobs/*`.
- Registration: In the module `boot()` function, register event listeners and job processors with the core bus/queue.
- Namespacing: Use the module name to namespace event types and job names (e.g., `users.user.created`, `users.sync_profile`).
- Contracts: Event payloads and job payloads should be typed and exported from the module’s contracts folder, or colocated next to handlers if internal.
- Invalidation: Modules subscribe to their own domain events to invalidate relevant cache keys.

### Example: Users module event + job

```ts
// modules/users/contracts/events.ts
export type UserCreatedPayload = { id: string; email: string };
export const USER_CREATED = 'users.user.created' as const;
```

```ts
// modules/users/events/onUserCreated.ts
import type { Services } from '@/core/services';
import { USER_CREATED, type UserCreatedPayload } from '@/modules/users/contracts/events';
export function registerUserEvents(services: Services) {
  services.events.on<UserCreatedPayload>(USER_CREATED, async (p) => {
    // cache invalidation example
    await services.cache.del('users:list');
    services.logger.info({ userId: p.id }, 'User created event handled');
  });
}
```

```ts
// modules/users/jobs/syncProfile.job.ts
import type { Services } from '@/core/services';
export type SyncProfilePayload = { userId: string };
export const SYNC_PROFILE = 'users.sync_profile' as const;
export async function enqueueSyncProfile(services: Services, payload: SyncProfilePayload) {
  await services.queue.add(SYNC_PROFILE, payload, { attempts: 5 });
}
// Processor registration (example; depends on queue adapter API)
export function registerJobProcessors(services: Services) {
  // If the queue exposes a processor registration, wire it here
  services.queue.process?.(SYNC_PROFILE, async (payload: SyncProfilePayload) => {
    // do work; you can use services.db/cache/logger here
    services.logger.info({ payload }, 'Processing sync profile');
  });
}
```

```ts
// modules/users/index.ts (boot wiring)
import { registerUserEvents } from './events/onUserCreated';
import { registerJobProcessors } from './jobs/syncProfile.job';
export const UsersModule = {
  name: 'users',
  register(services) {
    /* ... */
  },
  boot({ services }) {
    registerUserEvents(services);
    registerJobProcessors(services);
  },
} as const;
```

### In-memory queue adapter (dev/test)

If you use the in-memory queue adapter shown in DI docs, `services.queue.process` is available and runs handlers immediately in the same process. In production, replace `createQueue()` with BullMQ/SQS/etc. and wire processors accordingly.
