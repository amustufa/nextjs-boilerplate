# Config & Runtime

- Parse env once with Zod; expose typed config.
- Per-module config with prefixes and defaults; never log secrets (redaction list).
- Services/runtime: build a services registry and switch providers by runtime (edge/node). Only Node runtime executes module boot (events/jobs) to keep edge thin and stateless.

```ts
// core/config/index.ts
import { z } from 'zod';
export const Env = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']),
});
export type Env = z.infer<typeof Env>;
export const config: Env = Env.parse(process.env);
```

```ts
// core/config/module-config.ts
import { z, ZodTypeAny } from 'zod';
export type ModuleConfigDef<T> = { schema: ZodTypeAny; prefix?: string; defaults?: Partial<T> };
const registry = new Map<string, ModuleConfigDef<any>>();
export function defineModuleConfig<T>(name: string, def: ModuleConfigDef<T>) {
  registry.set(name, def);
}
export function loadModuleConfig<T>(name: string) {
  const def = registry.get(name)!;
  const prefix = def.prefix ?? name.toUpperCase() + '_';
  const entries = Object.entries(process.env).filter(([k]) => k.startsWith(prefix));
  const raw = Object.fromEntries(entries.map(([k, v]) => [k.replace(prefix, ''), v]));
  const parsed = (def.schema as any).parse({ ...(def.defaults ?? {}), ...raw });
  return parsed as T;
}
```

```ts
// core/runtime/services.ts
import { createServices } from '@/core/services';
import { getPrisma } from '@/core/db/prisma';
import { UsersModule } from '@/modules/users';
import { BillingModule } from '@/modules/billing';

export async function getServices(runtime: 'node' | 'edge' = 'node') {
  const services = await createServices([
    (b) => b.set('db', () => getPrisma(runtime)),
    UsersModule.register,
    BillingModule.register,
  ]);
  if (runtime === 'node') await UsersModule.boot?.({ services: Promise.resolve(services) });
  return services;
}
```

Edge usage guidance

- Edge routes are intentionally thin: validate, authorize, and perform simple reads. Do not bind event listeners, job processors, or Node-only adapters in edge.
- If a handler requires events/queue/logger or direct DB TCP, keep it on Node (`export const runtime = 'node' | 'nodejs'`).
