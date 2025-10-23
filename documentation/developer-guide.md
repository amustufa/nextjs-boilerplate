# Developer Guide

> This guide summarizes the architecture conventions and practical rules for working on this boilerplate without breaking boundaries or runtime assumptions.

## Architecture at a Glance

- Modules-first: vertical slices live under `modules/<name>` with `http`, `domain`, `data`, `contracts`, `events`, `jobs`, `schema`, `tests`, `types.ts`.
- Routing lives under `app/`: pages, route handlers, and route-local Server Actions must be defined in the `app/` tree.
- Services Registry: modules register a typed public API via `services.namespace('<name>', ns => ns.set('api', ...))`. Handlers access `this.services.<name>.<api>`.
- Request Builder: declare `defineRequest({ body, query, params })` and implement with `HttpRequest(RequestSpec)({ auth?, runtime? }, async function(){ ... })`.
- Normalized Envelopes: return `{ ok, data?, error?, meta? }`; lists include pagination meta. Prefer ETag for stable GET lists.
- Prisma Multi-file: put module schemas in `modules/*/schema/*.prisma`; run `pnpm prisma:collect` to symlink into `prisma/schemas/`.
- Output Types: define Prisma `select` per view and map with typed pipes (no DTO classes).

### Seeding

- Seeders live under `modules/<module>/seeds/*.seed.ts` (optional `seeds/global/*.seed.ts`).
- Each seeder exports a default object `{ name: string; order?: number; tags?: string[]; run(ctx) }`.
- Commands:
  - `pnpm db:seed` — run all seeders in stable order.
  - `pnpm db:seed --preview` — list which seeders would run.
  - `pnpm db:seed --only users,posts` — run only selected modules.
  - `pnpm db:seed --tags dev` — run only seeders matching tags.
  - `pnpm db:reset` — reset database then seed.
- Safety: refuses on production unless `--force`. Seeders should be idempotent (`upsert`, `connectOrCreate`).

### Module Scaffolder

- Interactive generator: `pnpm module:generate`.
- Prompts to create service, HTTP example, Prisma schema, seed example, and events/jobs stubs.
- Optionally wires the module into `core/runtime/services.ts` (imports, `.register`, and `.boot`).

### Provider-Agnostic Infra

- Use `this.services.cache`, `this.services.queue`, `this.services.jobs`, and `this.services.lock` via core contracts — never import provider SDKs directly in modules.
- Providers are selected by env in runtime (`CACHE_BACKEND`, `QUEUE_BACKEND`, `JOBS_BACKEND`, `LOCK_BACKEND`), with in-memory fallbacks for dev.
- Contracts are stable and provider-agnostic. Backends normalize options (e.g., attempts, delays, idempotency keys) behind the adapters.

#### Backends

- Cache: `memory`, `redis`
- Queue: `memory`, `bullmq` (shared queue `JOBS_QUEUE_NAME`)
- Jobs: `memory`, `bullmq` (repeatable jobs), `sqs` (one-off delays only; suggest EventBridge for cron)
- Lock: `memory`, `redis`

#### Env Examples

```
# Redis/BullMQ
CACHE_BACKEND=redis
QUEUE_BACKEND=bullmq
JOBS_BACKEND=bullmq
LOCK_BACKEND=redis
REDIS_URL=redis://localhost:6379
JOBS_QUEUE_NAME=app:jobs

# SQS
JOBS_BACKEND=sqs
AWS_REGION=us-east-1
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/app-jobs.fifo
SQS_FIFO=true
SQS_MESSAGE_GROUP_ID=app-jobs
```

#### CLI

- `pnpm jobs:stats --queues users.sync_profile`
- `pnpm jobs:cancel --id <id>`
- `pnpm jobs:cancel --name users.sync_profile --idempotencyKey key123 --cron "*/5 * * * *"`
- `pnpm jobs:cancel --name users.sync_profile --idempotencyKey key123 --everyMs 60000`

## Runtime Choice (Edge vs Node)

- Edge: keep handlers thin (validate, authorize, simple reads/compute). No module boot, event listeners, job processors, or Node-only adapters.
- Node: use for anything requiring events/queue/logger, background processing, or direct DB TCP.
- Prisma on Edge: only with `@prisma/client/edge` + Data Proxy/Accelerate. Otherwise keep DB-bound handlers on Node.
- Module `boot()` runs only in Node runtime.

## Module Checklist

- Public API registered in `modules/<name>/index.ts` via Services Registry.
- Contracts: request schemas and event/job payload types under `modules/<name>/contracts`.
- Data: `data/selects.ts` (Prisma selects) and `domain/views.ts` (pipes → view types).
- HTTP: Zod specs in `http/requests/*` and route handlers in `http/*.api.ts` using `HttpRequest`.
- UI: structure under `modules/<name>/ui`:
  - `components/*`: pure presentational components (props-only; no Services/fetch/cookies/revalidate).
  - `fragments/*`: composite UI pieces composing components (same rules as components).
  - `forms/*`: form components that accept a server action via `action` prop; no Services/fetch inside.
  - `loaders/` (or `loaders.ts`): server-only data loaders; may call `getServices`; no JSX.
- `hooks/*`: client-only UI hooks for ephemeral state (no business logic/state).
  - Client-side data hooks: allowed under `ui/hooks/*` using React Query/SWR or simple fetch.
    - Hydrate from server loaders (initialData) and background revalidate for smoother UX.
    - Call API routes for reads; mutations should go through server actions or API handlers exposed as mutate functions.
  - `styles/*` and `tests/*` optional.
  - Keep pages/route handlers and server actions in `app/` and compose module UI there.
- Events/Jobs: defined under `events/*` and `jobs/*`; registered in `boot()`.
- Types: public types re-exported from `modules/<name>/types.ts`; optional aggregator in `modules/types.ts`.
- Schema: module-local `.prisma` files under `schema/`.
- Tests: unit tests colocated under `modules/<name>/tests/{unit, integration, e2e}`.

## Coding Rules

- TypeScript strict; no `any`, no `ts-ignore` without context. Narrow unknown with Zod.
- No deep module imports; only via `contracts/`, public type barrels, or Services.
- Do not import core adapters (cache/logger/queue/events) in modules; use Services.
- Prefer type-only imports and derive types from Prisma select rules.
- Consider ETag (and 304) for stable GET lists; add basic rate limit in dev if needed.
- UI state is server-first: load in server components; mutate via server actions/handlers; revalidate. Use client state only for ephemeral UI. Cookies only for auth/session and trivial preferences.

## Common Pitfalls

- Binding listeners/processors in edge routes. Solution: bind in `boot()` on Node only.
- Returning raw arrays/objects. Solution: return normalized envelope with meta.
- Direct DB queries in edge without proxy. Solution: keep on Node or configure Prisma Edge + proxy.
- Mixing schema locations. Solution: always use `modules/*/schema/*.prisma` and run `prisma:collect`.

## Local Workflow

- Install deps: `pnpm install`.
- Env: copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_JWT_SECRET`.
- Prisma: `pnpm prisma:generate`, `pnpm prisma:migrate` (runs `prisma:collect`).
- Dev: `pnpm dev`.
- Lint/Types: `pnpm lint`, `pnpm typecheck`.
- Tests: `pnpm test`.
