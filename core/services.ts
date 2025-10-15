import type { PrismaClient } from '@prisma/client';

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
    opts?: { delayMs?: number; attempts?: number; idempotencyKey?: string },
  ): Promise<void>;
  process?<T = unknown>(name: string, handler: (payload: T) => Promise<void>): void;
}

export interface JobsScheduleOptions {
  runAt?: Date;
  delayMs?: number;
  everyMs?: number;
  cron?: string;
  idempotencyKey?: string;
}

export interface JobsCancelOptions {
  id?: string;
  name?: string;
  idempotencyKey?: string;
  cron?: string;
  everyMs?: number;
}

export interface Jobs {
  schedule<T = unknown>(
    name: string,
    payload: T,
    opts: JobsScheduleOptions,
  ): Promise<{ id: string }>;
  cancel(opts: JobsCancelOptions): Promise<number>;
  process<T = unknown>(name: string, handler: (payload: T) => Promise<void>): void;
}

export interface Lock {
  acquire(key: string, ttlMs: number): Promise<{ ok: true; token: string } | { ok: false }>;
  release(key: string, token: string): Promise<void>;
}

export interface ServicesBase {
  db: PrismaClient;
  cache: Cache;
  logger: Logger;
  events: Events;
  queue: Queue;
  jobs?: Jobs;
  lock?: Lock;
}

// Augment this in modules to add typed namespaces e.g. `users`.
declare global {
  // Modules augment this to contribute their typed namespaces, e.g., `users`.
  interface AppServiceNamespaces {}
}

export type Services = ServicesBase & {
  [K in keyof AppServiceNamespaces]?: AppServiceNamespaces[K];
};

export interface NamespaceBuilder<K extends string> {
  set<N extends string>(
    name: N,
    factory: (s: Services & Record<K, Record<string, unknown>>) => unknown,
  ): void;
}

export interface ServicesBuilder {
  set<K extends keyof Services & string>(key: K, factory: () => Services[K]): void;
  namespace<K extends string>(key: K, fn: (ns: NamespaceBuilder<K>) => void): void;
}

export type BuilderFn = (b: ServicesBuilder) => void;

export async function createServices(steps: BuilderFn[]): Promise<Services> {
  const registry: Partial<Services> = {};
  const reg = registry as unknown as Record<string, unknown>;

  const builder: ServicesBuilder = {
    set(key, factory) {
      reg[key] = factory() as unknown;
    },
    namespace(key, fn) {
      const existing = reg[key] as Record<string, unknown> | undefined;
      const nsObj: Record<string, unknown> =
        existing ?? ((reg[key] = {} as Record<string, unknown>) as Record<string, unknown>);
      const ns: NamespaceBuilder<typeof key> = {
        set(
          name: string,
          factory: (s: Services & Record<typeof key, Record<string, unknown>>) => unknown,
        ) {
          const s = Object.assign({}, registry, { [key]: nsObj }) as Services &
            Record<typeof key, Record<string, unknown>>;
          nsObj[String(name)] = factory(s) as unknown;
        },
      } as unknown as NamespaceBuilder<typeof key>;
      fn(ns);
    },
  };

  for (const step of steps) await step(builder);
  return registry as Services;
}
