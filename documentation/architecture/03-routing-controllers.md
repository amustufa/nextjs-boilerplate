# Routing & Requests

## Route Re-export

```ts
// app/(modules)/users/api/route.ts
export { GET, POST } from '@/modules/users/http/user.api';
export const runtime = 'node'; // or 'edge'
```

## Where Pages and Routes Live

- Next.js only treats files under `app/` as routable (pages, route handlers). Do not place routable files under `modules/*/ui`.
- Keep `app/*` files thin: they compose reusable components from `modules/*/ui` and wire route-local server actions.
- Server Actions are scoped to their route segments under `app/` — define them alongside the page/route that uses them.

## Laravel‑style Request Builder (preferred)

```ts
// core/http/request.ts
import { NextResponse } from 'next/server';
import { z, ZodTypeAny } from 'zod';
import { getServices } from '@/core/runtime/services';
import { getAuthUser } from '@/core/http/middleware';
import type { Services } from '@/core/services';
import type { AuthUser } from '@/core/http/auth';
import { ok, fail } from '@/core/http/response';
import { normalizeError } from '@/core/http/errors';

type Spec<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny> = {
  body: B;
  query: Q;
  params: P;
};
type Opts = { auth?: boolean; runtime?: 'node' | 'edge'; status?: number };

export type RequestTools<B, Q, P> = {
  validate(): { body: B; query: Q; params: P };
  services: Services;
  user: AuthUser | null;
  request: Request;
};

export function defineRequest<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny>(
  spec: Spec<B, Q, P>,
) {
  return spec;
}

export function HttpRequest<B extends ZodTypeAny, Q extends ZodTypeAny, P extends ZodTypeAny>(
  spec: Spec<B, Q, P>,
) {
  type Body = z.infer<B>;
  type Query = z.infer<Q>;
  type Params = z.infer<P>;
  return (
    opts: Opts = {},
    handler: (
      this: RequestTools<Body, Query, Params>,
      ctx?: RequestTools<Body, Query, Params>,
    ) => Promise<unknown> | unknown,
  ) => {
    return async function handlerWrapper(
      this: unknown,
      request: Request,
      ctx: { params: unknown },
    ) {
      try {
        const url = new URL(request.url);
        const queryObj = Object.fromEntries(url.searchParams.entries());
        const rawBody =
          request.method === 'GET' || request.method === 'HEAD'
            ? undefined
            : await request.json().catch(() => undefined);
        const body = spec.body.parse(rawBody) as Body;
        const query = spec.query.parse(queryObj) as Query;
        const params = spec.params.parse(ctx?.params ?? {}) as Params;
        const services = getServices();
        const user = opts.auth ? await getAuthUser() : null;
        const tools: RequestTools<Body, Query, Params> = {
          validate: () => ({ body, query, params }),
          services,
          user,
          request,
        };
        // allow both `function(){ this.validate() }` and `(_, ctx) => ctx.validate()` styles
        const data = await (handler as any).call(tools, tools);
        return NextResponse.json(data, { status: opts.status ?? 200 });
      } catch (e) {
        const { httpStatus, error } = normalizeError(e);
        return NextResponse.json(fail(error), { status: httpStatus });
      }
    };
  };
}
```

### Usage

```ts
// modules/users/http/requests/create-user.request.ts
import { z } from 'zod';
import { defineRequest } from '@/core/http/request';
export const CreateUserRequest = defineRequest({
  body: z.object({ email: z.string().email(), name: z.string().min(1) }),
  query: z.object({}),
  params: z.object({}),
});
```

```ts
// modules/users/http/user.api.ts
import { HttpRequest } from '@/core/http/request';
import { CreateUserRequest } from './requests/create-user.request';
export const POST = HttpRequest(CreateUserRequest)({ auth: true }, async function () {
  const { body } = this.validate();
  return this.services.users!.service.create(body);
});
```

> Note: Use a `function` handler (not arrow) to access the bound `this`. If you prefer arrows, you can accept the tools as the first argument and call `ctx.validate()`.

// Legacy controller aliases are removed in favor of HttpRequest. Use the Request builder for all new handlers.

## Runtime Note

- Edge routes (`export const runtime = 'edge'`) are intentionally thin: validate input, authorize, perform simple compute, and return a response. Do not bind module boot logic, event bus/listeners, job processors, or Node-only adapters.
- Avoid Node-only APIs on edge (`events`, `pino` logger, in-memory queues). Keep these in Node routes. If a handler needs them, move it to `runtime = 'node'`.
- If using Prisma, edge handlers must use `@prisma/client/edge` with a proxy (Accelerate/Data Proxy). Otherwise, keep DB-bound handlers on Node.
