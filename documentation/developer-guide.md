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
