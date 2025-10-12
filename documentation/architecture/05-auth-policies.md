# Auth & Policies

- Put policies in `modules/*/domain/policies/*` that receive the AuthUser and a resource.
- Provide a core authorize(user, policy, resource) helper for route handlers & server components.

```ts
// core/http/auth.ts
export interface AuthUser {
  id: string;
  role: 'admin' | 'member';
}
export type Policy<T> = (user: AuthUser, resource?: T) => boolean | Promise<boolean>;
```

```ts
// modules/users/domain/policies/canViewUsers.ts
import { Policy } from '@/core/http/auth';
export const canViewUsers: Policy<void> = (u) => u.role === 'admin';
```

```ts
// usage in handler
import { canViewUsers } from '@/modules/users/domain/policies/canViewUsers';
import { getAuthUser, forbid } from '@/core/http/middleware';
export async function GET() {
  const user = await getAuthUser();
  if (!(await canViewUsers(user))) return forbid();
  // ... proceed
}
```

## Example: Users module policy and usage

```ts
// modules/users/domain/policies/canCreateUser.ts
import type { Policy } from '@/core/http/auth';
import type { AuthUser } from '@/core/http/auth';
export const canCreateUser: Policy<void> = (user: AuthUser) => user.role === 'admin';
```

```ts
// modules/users/http/user.api.ts (excerpt)
import { authorize } from '@/core/http/auth';
import { canCreateUser } from '@/modules/users/domain/policies/canCreateUser';
import { forbid } from '@/core/http/middleware';

export const POST = HttpRequest(CreateUserRequest)({ auth: true }, async function () {
  if (!(await authorize(this.user, canCreateUser))) return forbid();
  return this.services.users!.service.create(this.validate().body);
});
```

Notes

- Edge handlers can perform `auth: true` and policy checks, but must not bind Node-only adapters (events/queue/logger). If a mutation needs those, keep it on Node runtime.
