# Modules: Anatomy & Lifecycle

## Module Manifest

```ts
// modules/users/index.ts
import { type Module } from '@/core/module';
import { UsersService } from './domain/users.service';
import { UsersRepo } from './data/users.repo';
import { ServicesBuilder } from '@/core/services';

export const UsersModule: Module = {
  name: 'users',
  register(services: ServicesBuilder) {
    services.namespace('users', (ns) => {
      ns.set('repo', ({ db }) => new UsersRepo(db));
      ns.set('service', ({ users }) => new UsersService(users.repo));
    });
  },
  async boot({ services }) {
    const db = services.db;
    await db.migrate();
  },
};
```

## Container (Minimal)

```ts
// core/container/index.ts
export class SimpleContainer implements Container {
  private factories = new Map<Token<any>, Binder<any>>();
  private singletons = new Map<Token<any>, any>();
  bind<T>(t: Token<T>, factory: Binder<T>) {
    this.factories.set(t, factory);
  }
  get<T>(t: Token<T>): T {
    if (this.singletons.has(t)) return this.singletons.get(t);
    const f = this.factories.get(t);
    if (!f) throw new Error(`Token not bound: ${String(t.description ?? t)}`);
    const value = f({ get: this.get.bind(this) });
    this.singletons.set(t, value);
    return value;
  }
}
```

## Module Loader

```ts
// core/module.ts
export async function loadModules(mods: Module[], c: Container) {
  for (const m of mods) m.register(c);
  for (const m of mods) if (m.boot) await m.boot(c);
}
```
