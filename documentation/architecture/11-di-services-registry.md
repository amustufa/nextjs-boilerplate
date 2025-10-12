# DI & Services Registry

## Recommendation: Typed Services Registry

- Avoid scattered tokens: each module registers a public API under its own namespace in a shared `Services` object.
- Consumers access via `services.<module>.<name>` with full TypeScript types.
- Modules hide internals; only public API is registered.
- Request vs singleton scope is modeled by the API functions/providers.

### Services Typing

```ts
// core/services.ts
import type { PrismaClient } from '@prisma/client';
// Core shared services (examples)
export interface Cache {
  get<T>(k: string): Promise<T | null>;
  set<T>(k: string, v: T, ttlSec?: number): Promise<void>;
  del(k: string): Promise<void>;
  wrap<T>(k: string, ttlSec: number, fn: () => Promise<T>): Promise<T>;
}
export interface Logger {
  info(o: unknown, msg?: string): void;
  error(o: unknown, msg?: string): void;
  warn(o: unknown, msg?: string): void;
  debug(o: unknown, msg?: string): void;
}
export interface Events {
  on<T = unknown>(type: string, fn: (p: T) => void | Promise<void>): void;
  emit<T = unknown>(type: string, payload: T): void;
}
export interface Queue {
  add<T = unknown>(
    name: string,
    payload: T,
    opts?: { delayMs?: number; attempts?: number },
  ): Promise<void>;
  // Optional: processor registration (if adapter supports workers)
  process?<T = unknown>(name: string, handler: (payload: T) => Promise<void>): void;
}

export type Services = {
  // core shared services
  db: PrismaClient; // Prisma client; use edge/node variant per route runtime
  cache: Cache; // injected cache adapter
  logger: Logger; // app logger
  events: Events; // event bus wrapper
  queue: Queue; // background jobs adapter

  // module namespaces (public APIs)
  users?: { repo: UsersRepoPort; service: UsersServicePort };
  billing?: { payments: PaymentsPort };
};

export interface NamespaceBuilder<K extends keyof Services> {
  set<N extends keyof NonNullable<Services[K]>>(
    name: N,
    factory: (s: Services & Record<K, NonNullable<Services[K]>>) => NonNullable<Services[K]>[N],
  ): void;
}

export interface ServicesBuilder {
  set<K extends keyof Services & string>(key: K, factory: () => Services[K]): void;
  namespace<K extends keyof Services & string>(key: K, fn: (ns: NamespaceBuilder<K>) => void): void;
}
```

### Building Services

```ts
// core/runtime/services.ts
import { createServices } from '@/core/services';
import { getPrisma } from '@/core/db/prisma';
import { UsersModule } from '@/modules/users';
import { BillingModule } from '@/modules/billing';

export const services = await createServices([
  (b) => b.set('db', () => getPrisma('node')),
  UsersModule.register,
  BillingModule.register,
]);

export const getServices = () => services; // used in requests/handlers
```

### Minimal createServices Implementation (reference)

```ts
// core/services.ts (reference implementation sketch)
export type BuilderFn = (b: ServicesBuilder) => void;

export async function createServices(steps: BuilderFn[]): Promise<Services> {
  const registry: Partial<Services> = {};

  const builder: ServicesBuilder = {
    set(key, factory) {
      // @ts-expect-error index
      registry[key] = factory();
    },
    namespace(key, fn) {
      // @ts-expect-error index
      registry[key] ||= {} as any;
      const nsObj = registry[key] as Record<string, unknown>;
      const ns: NamespaceBuilder<any> = {
        set(name, factory) {
          // The factory receives the fully typed Services
          // We'll pass a view that includes the namespace as already built
          const s = new Proxy({ ...registry, [key]: nsObj } as Services, {
            get: (t, p) => (t as any)[p],
          });
          nsObj[name as string] = factory(s as any);
        },
      } as any;
      fn(ns);
    },
  };

  for (const step of steps) await step(builder);
  return registry as Services;
}
```

### Injecting Shared Services (cache, logger, queue)

- Define core providers in the services bootstrap and inject them into module factories via the namespace builder. Modules never import shared singletons directly; they receive them via the Services object.

```ts
// core/cache/index.ts (interface)
export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  // optional helper
  wrap<T>(key: string, ttlSec: number, fn: () => Promise<T>): Promise<T>;
}

// core/runtime/services.ts (bootstrap shared services)
import { createCache } from '@/core/cache/adapter';
export const services = await createServices([
  (b) => b.set('db', () => getPrisma('node')),
  (b) => b.set('cache', () => createCache({ url: process.env.REDIS_URL! })),
  (b) => b.set('logger', () => createLogger()),
  (b) => b.set('events', () => createEventsBus()),
  (b) => b.set('queue', () => createQueue()),
  UsersModule.register,
  BillingModule.register,
]);

// modules/users/index.ts (inject into module API)
export const UsersModule: Module = {
  name: 'users',
  register(services) {
    services.namespace('users', (ns) => {
      ns.set('repo', ({ db, cache }) => new UsersRepo(db, cache));
      ns.set('service', ({ users, cache }) => new UsersService(users.repo, cache));
    });
  },
};

// modules/users/domain/users.service.ts (consume injected cache)
export class UsersService {
  constructor(
    private repo: Repo,
    private cache: Cache,
  ) {}
  async list() {
    return this.cache.wrap('users:list', 60, () => this.repo.list());
  }
}
```

Notes

- Edge runtime: bind an edge-safe cache provider (e.g., KV) in the services bootstrap for edge routes; modules remain unchanged.
- Testing: override `services.cache` with an in-memory stub in test harnesses without changing module code.

### Adapter Factories (examples)

Provide thin factories that satisfy the shared service interfaces; swap by environment (dev/prod/edge/tests).

```ts
// core/cache/adapter.ts
import type { Cache } from '@/core/services';

export function createCache(opts: { url?: string } = {}): Cache {
  // In prod, build a Redis/Upstash cache; here is a minimal in-memory fallback
  const store = new Map<string, { v: unknown; exp: number | null }>();
  const now = () => Date.now();
  const get = async <T>(k: string): Promise<T | null> => {
    const e = store.get(k);
    if (!e) return null;
    if (e.exp && e.exp < now()) {
      store.delete(k);
      return null;
    }
    return e.v as T;
  };
  const set = async <T>(k: string, v: T, ttlSec?: number) => {
    const exp = ttlSec ? now() + ttlSec * 1000 : null;
    store.set(k, { v, exp });
  };
  const del = async (k: string) => {
    store.delete(k);
  };
  const wrap = async <T>(k: string, ttlSec: number, fn: () => Promise<T>) => {
    const cached = await get<T>(k);
    if (cached != null) return cached;
    const val = await fn();
    await set(k, val, ttlSec);
    return val;
  };
  return { get, set, del, wrap };
}
```

```ts
// core/logger/adapter.ts
import type { Logger } from '@/core/services';
export function createLogger(): Logger {
  return {
    info(o, msg) {
      console.log(msg ?? '', o);
    },
    error(o, msg) {
      console.error(msg ?? '', o);
    },
    warn(o, msg) {
      console.warn(msg ?? '', o);
    },
    debug(o, msg) {
      console.debug(msg ?? '', o);
    },
  };
}
```

```ts
// core/events/adapter.ts
import { EventEmitter } from 'node:events';
import type { Events } from '@/core/services';
export function createEventsBus(): Events {
  const ee = new EventEmitter();
  return {
    on(type, fn) {
      ee.on(type, fn as any);
    },
    emit(type, payload) {
      ee.emit(type, payload);
    },
  };
}
```

```ts
// core/queue/adapter.ts
import type { Queue } from '@/core/services';
export function createQueue(): Queue {
  // Minimal in-memory dev/test queue with process support
  const handlers = new Map<string, (payload: any) => Promise<void>>();
  const pending: { name: string; payload: any }[] = [];
  let pumping = false;
  async function pump() {
    if (pumping) return;
    pumping = true;
    while (pending.length) {
      const job = pending.shift()!;
      const h = handlers.get(job.name);
      if (h) await h(job.payload);
    }
    pumping = false;
  }
  return {
    async add(name, payload) {
      pending.push({ name, payload });
      await pump();
    },
    process(name, handler) {
      handlers.set(name, handler);
    },
  };
}
```

### Using Services in Requests

```ts
// modules/users/http/user.api.ts
import { defineRequest, HttpRequest } from '@/core/http/request';
import { z } from 'zod';

const CreateUserRequest = defineRequest({
  body: z.object({ email: z.string().email(), name: z.string().min(1) }),
  query: z.object({}),
  params: z.object({}),
});

export const POST = HttpRequest(CreateUserRequest)({ auth: true }, async function () {
  const { body } = this.validate();
  return await this.services.users!.service.create(body);
});
```

## Request Pattern

- See 03-routing-controllers.md for the Request builder API (defineRequest + HttpRequest).

### Why token‑less?

- Simpler, more discoverable surface for teams (no token sprawl).
- Strong compile‑time typing via the Services structure.
- Easier governance: modules declare exactly what they expose; consumers use only public APIs.
