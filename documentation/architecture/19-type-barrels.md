# Type Barrels (Core and Modules)

- Goal: Simple, stable type-only imports via `@/core/types` and `@/modules/types`.
- Barrels re-export types using `export type` only (no runtime values).
- Modules re-export only public types from `contracts/` (DTOs, ports). Domain internals stay private.
- Each module exposes its own types barrel at `modules/<module>/types.ts`.
- The global modules barrel `modules/types.ts` re-exports from each module barrel.
- Consumers import with `import type { X } from '@/modules/<module>/types'` or aggregated via `@/modules/types`; core types from `@/core/types`.

```ts
// modules/users/contracts/index.ts (inputs only)
import { z } from 'zod';
export const CreateUserSchema = z.object({ email: z.string().email(), name: z.string().min(1) });
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

```ts
// modules/users/domain/views.ts (public view types)
export type UserListItem = { id: string; email: string; name: string; createdAt: string };
export type UsersListResult = { items: UserListItem[]; total: number };
```

```ts
// modules/users/types.ts (module-level types barrel)
export type { CreateUserInput } from './contracts';
export type { UserListItem, UsersListResult } from './domain/views';
```

```ts
// modules/billing/types.ts (another module)
export type { PaymentInput, PaymentView } from './contracts';
```

```ts
// modules/types.ts (global aggregator)
export type * as UsersTypes from './users/types';
export type * as BillingTypes from './billing/types';
```

```ts
// core/types.ts
export type { Module, Container, Token } from '@/core/module';
export type { Envelope } from '@/core/http/response';
export type { AuthUser } from '@/core/http/auth';
export type { ErrorKind } from '@/core/http/errors';
```
