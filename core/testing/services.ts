import type { Services } from '@/core/services';

export function createMockServices(overrides: Partial<Services> = {}): Services {
  const cacheStore = new Map<string, { v: unknown; exp: number | null }>();
  const now = () => Date.now();
  const cache: Services['cache'] = {
    async get<T>(k: string) {
      const e = cacheStore.get(k);
      if (!e) return null;
      if (e.exp && e.exp < now()) {
        cacheStore.delete(k);
        return null;
      }
      return e.v as T;
    },
    async set<T>(k: string, v: T, ttlSec?: number) {
      const exp = ttlSec ? now() + ttlSec * 1000 : null;
      cacheStore.set(k, { v, exp });
    },
    async del(k: string) {
      cacheStore.delete(k);
    },
    async wrap<T>(k: string, ttlSec: number, fn: () => Promise<T>) {
      const cached = await this.get<T>(k);
      if (cached != null) return cached;
      const val = await fn();
      await this.set(k, val, ttlSec);
      return val;
    },
  };

  const logger: Services['logger'] = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  };

  const listeners = new Map<string, ((p: unknown) => void | Promise<void>)[]>();
  const events: Services['events'] = {
    on<T = unknown>(type: string, fn: (p: T) => void | Promise<void>) {
      const arr = listeners.get(type) ?? [];
      arr.push(fn as (p: unknown) => void | Promise<void>);
      listeners.set(type, arr);
    },
    emit<T = unknown>(type: string, payload: T) {
      const arr = listeners.get(type) ?? [];
      for (const fn of arr) void fn(payload);
    },
  };

  const queueHandlers = new Map<string, (p: unknown) => Promise<void>>();
  const queue: Services['queue'] = {
    async add(name: string, payload: unknown) {
      const h = queueHandlers.get(name);
      if (h) await h(payload);
    },
    process<T = unknown>(name: string, handler: (payload: T) => Promise<void>) {
      queueHandlers.set(name, (p: unknown) => handler(p as T));
    },
  };

  const base: Services = {
    db: {} as unknown as Services['db'],
    cache,
    logger,
    events,
    queue,
  };

  return { ...base, ...overrides } as Services;
}

export function setTestServices(services: Services): void {
  const g = globalThis as unknown as { __services?: Promise<Services> };
  g.__services = Promise.resolve(services);
}

export function clearTestServices(): void {
  const g = globalThis as unknown as { __services?: Promise<Services> };
  delete g.__services;
}
