# Example: Users Module (End-to-End)

This example stitches the patterns together: types barrel, Prisma select + pipes, service with cache, events + jobs, and an HttpRequest-based handler using the Services Registry.

## Files

- modules/users/types.ts
- modules/users/data/selects.ts
- modules/users/domain/projections/list.projection.ts
- modules/users/domain/services/users.service.ts
- modules/users/contracts/events.ts
- modules/users/events/onUserCreated.ts
- modules/users/jobs/syncProfile.job.ts
- modules/users/http/user.api.ts
- modules/users/index.ts

## Module Types Barrel

```ts
// modules/users/types.ts
export type { CreateUserInput } from './contracts';
export type { UserListItem } from './domain/projections/list.projection';
```

## Select Rules

```ts
// modules/users/data/selects.ts
import { Prisma } from '@prisma/client';
export const userListSelect = { id: true, email: true, name: true, createdAt: true } as const;
export type UserListRow = Prisma.UserGetPayload<{ select: typeof userListSelect }>;
```

## Projections (API view models)

Note: “Projections” are backend output shapes and mapping functions for API responses — not UI/React views. They live under `domain/projections/*` to avoid confusion with UI components.

```ts
// modules/users/domain/projections/list.projection.ts
import type { UserListRow } from '../data/selects';
export type UserListItem = { id: string; email: string; name: string; createdAt: string };
export const toUserListItem = (row: UserListRow): UserListItem => ({
  id: row.id,
  email: row.email,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});
```

## Service (with cache)

```ts
// modules/users/domain/services/users.service.ts
import type { Cache } from '@/core/services';
import type { PrismaClient } from '@prisma/client';
import { userListSelect, type UserListRow } from '../data/selects';
import { toUserListItem, type UserListItem } from '../projections/list.projection';

export class UsersService {
  constructor(
    private prisma: PrismaClient,
    private cache: Cache,
  ) {}
  async list(): Promise<UserListItem[]> {
    return this.cache.wrap('users:list', 60, async () => {
      const rows: UserListRow[] = await this.prisma.user.findMany({ select: userListSelect });
      return rows.map(toUserListItem);
    });
  }
}
```

## Events

```ts
// modules/users/contracts/events.ts
export type UserCreatedPayload = { id: string; email: string };
export const USER_CREATED = 'users.user.created' as const;
```

```ts
// modules/users/events/onUserCreated.ts
import type { Services } from '@/core/services';
import { USER_CREATED, type UserCreatedPayload } from '../contracts/events';
export function registerUserEvents(services: Services) {
  services.events.on<UserCreatedPayload>(USER_CREATED, async (p) => {
    await services.cache.del('users:list');
    services.logger.info({ userId: p.id }, 'User created event handled');
  });
}
```

## Job

```ts
// modules/users/jobs/syncProfile.job.ts
import type { Services } from '@/core/services';
export type SyncProfilePayload = { userId: string };
export const SYNC_PROFILE = 'users.sync_profile' as const;
export async function enqueueSyncProfile(services: Services, payload: SyncProfilePayload) {
  await services.queue.add(SYNC_PROFILE, payload, { attempts: 5 });
}
export function registerJobProcessors(services: Services) {
  services.queue.process?.(SYNC_PROFILE, async (payload: SyncProfilePayload) => {
    services.logger.info({ payload }, 'Processing sync profile');
  });
}
```

## Controller (Services Registry variant)

```ts
// modules/users/http/user.api.ts
import { defineRequest, HttpRequest } from '@/core/http/request';
import { z } from 'zod';
import { authorize } from '@/core/http/auth';
import { canCreateUser } from '@/modules/users/domain/policies/canCreateUser';
import { etagFor, handleConditionalGet } from '@/core/http/etag';

const ListUsersRequest = defineRequest({
  body: z.object({}),
  query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
  params: z.object({}),
});

export const GET = HttpRequest(ListUsersRequest)({}, async function () {
  const { items } = await this.services.users!.service.list();
  const etag = etagFor(items);
  const cond = handleConditionalGet(this.request, etag);
  if (cond.notModified) return cond.response!;
  return { items };
});

// Example guarded mutation with policy
const CreateUserRequest = defineRequest({
  body: z.object({ email: z.string().email(), name: z.string().min(1) }),
  query: z.object({}),
  params: z.object({}),
});
export const POST = HttpRequest(CreateUserRequest)({ auth: true }, async function () {
  if (!(await authorize(this.user, canCreateUser))) throw new Error('Forbidden');
  return this.services.users!.service.create(this.validate().body);
});
```

## UI Examples (Server-first)

- `/users` — server component + server action using Services directly.
- `/users/server-action` — explicit server action example (Services-based).
- `/users/api-example` — server action proxy calling the API route.
- `/users/server-action-redirect` — server action with Post/Redirect/Get (revalidates, then `redirect()` for clean history and to avoid returning RSC payload).
- `/users/client-hook` — server-rendered initial data + client hook (`useUsersQuery`) that reads from the API and keeps the list fresh without navigation.

## Module Manifest

```ts
// modules/users/index.ts
import { UsersService } from './domain/services/users.service';
import { registerUserEvents } from './events/onUserCreated';
import { registerJobProcessors } from './jobs/syncProfile.job';

export const UsersModule = {
  name: 'users',
  register(services) {
    services.namespace('users', (ns) => {
      ns.set('repo', ({ db, cache }) => ({
        create: (d: { email: string; name: string }) => db.user.create({ data: d }),
        list: () => db.user.findMany(),
      }));
      ns.set('service', ({ db, cache, users }) => new UsersService(db, cache));
    });
  },
  boot({ services }) {
    registerUserEvents(services);
    registerJobProcessors(services);
  },
} as const;
```

This example shows the flow:

- db/cache/logger/events/queue are injected via Services bootstrap.
- The module registers a typed public API under services.users.
- Controller uses the services registry variant to access services.users.service.
- Events and jobs are registered in boot() and receive shared services via injection (Node runtime only). Edge handlers remain thin and do not bind listeners/processors.
