# Domain, Data (Prisma 6.7), Contracts

## Entities & Services

```ts
// modules/users/domain/user.entity.ts
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}

// modules/users/domain/users.service.ts
import { type User } from './user.entity';
export interface CreateUser {
  email: string;
  name: string;
}
export class UsersService {
  constructor(private repo: { create(d: CreateUser): Promise<User>; list(): Promise<User[]> }) {}
  async create(d: CreateUser) {
    return this.repo.create(d);
  }
  async list() {
    return this.repo.list();
  }
}
```

### Named Types Only in Public APIs

- Do not use inline object types in exported service/repository/http signatures (e.g., `Promise<{ id: string; ... }>`).
- Define named types or interfaces (e.g., `UserRecord`, `UsersListResult`) and export them from the module’s `types.ts` barrel.
- This keeps contracts consistent, discoverable, and easier to refactor.

## Data access (Prisma 6.7 multi-file, edge-aware)

```ts
// core/db/prisma.ts
import type { PrismaClient } from '@prisma/client';
let prisma: PrismaClient | undefined;
export async function getPrisma(runtime: 'node' | 'edge' = 'node') {
  if (prisma) return prisma;
  if (runtime === 'edge') {
    const { PrismaClient } = await import('@prisma/client/edge');
    // Note: the edge PrismaClient type differs; adapt in implementation
    prisma = new (PrismaClient as unknown as { new (): PrismaClient })();
  } else {
    const { PrismaClient } = await import('@prisma/client');
    prisma = new PrismaClient();
  }
  return prisma;
}
```

```ts
// modules/users/data/users.repo.ts
import type { PrismaClient } from '@prisma/client';
export class UsersRepo {
  constructor(private prisma: PrismaClient) {}
  async create(d: { email: string; name: string }) {
    return await this.prisma.user.create({ data: d });
  }
  async list() {
    return await this.prisma.user.findMany();
  }
}
```

```prisma
// modules/users/schema/user.prisma (module-local schema file)
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
}
```

> Prisma v6.7 multi-file schemas: Keep `datasource` + `generator` in `prisma/base.prisma`. Place module schemas next to their modules (e.g., `modules/*/schema/*.prisma`) and use a lightweight collector (copy/symlink) to expose them under `prisma/schemas/` before running Prisma CLI with `--schema prisma`. See 17-data-migrations.md.

## Validation & Contracts

```ts
// modules/users/contracts/index.ts
import { z } from 'zod';
// Input schemas (validation) for incoming requests
export const CreateUserSchema = z.object({ email: z.string().email(), name: z.string().min(1) });
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

## Prisma Select Rules + Pipes (no DTO normalization)

Instead of normalizing via DTO classes, define per‑view Prisma `select` rules and transform with typed pipes.

```ts
// modules/users/data/selects.ts
import { Prisma } from '@prisma/client';
export const userListSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
} as const;
export type UserListRow = Prisma.UserGetPayload<{ select: typeof userListSelect }>;

export const userDetailsSelect = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  // relations can be nested selects
} as const;
export type UserDetailsRow = Prisma.UserGetPayload<{ select: typeof userDetailsSelect }>;
```

```ts
// core/pipes.ts
export type Pipe<I, O> = (i: I) => O;
export const map =
  <I, O>(p: Pipe<I, O>) =>
  (arr: I[]) =>
    arr.map(p);
export const compose =
  <A, B, C>(ab: Pipe<A, B>, bc: Pipe<B, C>): Pipe<A, C> =>
  (a) =>
    bc(ab(a));
```

```ts
// modules/users/domain/views.ts
export type UserListItem = { id: string; email: string; name: string; createdAt: string };
export const userListPipe: Pipe<UserListRow, UserListItem> = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});
```

```ts
// modules/users/domain/users.service.ts (usage)
import type { PrismaClient } from '@prisma/client';
import { userListSelect, type UserListRow } from '@/modules/users/data/selects';
import { userListPipe, type UserListItem } from './views';
export class UsersService {
  constructor(private prisma: PrismaClient) {}
  async list(): Promise<UserListItem[]> {
    const rows: UserListRow[] = await this.prisma.user.findMany({ select: userListSelect });
    return rows.map(userListPipe);
  }
}
```

This achieves:

- Strict compile‑time types from Prisma selects.
- No DTO classes; simple typed pipes convert one type to another.
- Clear per‑view projection rules and transformations.

## Projections (API view models)

- To avoid confusion with UI “views”, place API output shapes and mapping functions under a `projections/` folder in the domain layer.
- Example: `modules/users/domain/projections/list.projection.ts` defines the API view model for a list endpoint and the projection pipe:

```ts
// modules/users/domain/projections/list.projection.ts
import type { UserListRow } from '@/modules/users/data/selects';

export type UserListItem = { id: string; email: string; name: string; createdAt: string };
export const toUserListItem = (row: UserListRow): UserListItem => ({
  id: row.id,
  email: row.email,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});

export type UsersListResult = { items: UserListItem[]; total: number };
```

- Export public projection types via the module types barrel (e.g., `modules/users/types.ts`) and import them in services and HTTP handlers.
