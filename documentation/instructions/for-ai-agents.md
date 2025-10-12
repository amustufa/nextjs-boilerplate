# Instructions for AI Agents Working on This Project

## Checklist TL;DR

- Keep routable files under `app/` (pages/routes/server actions); reusable UI under `modules/*/ui/components/*`.
- Edge handlers are thin; Node for events/queue/logger/DB TCP; boot only on Node.
- Server-first UI: server components + server actions; client state ephemeral; no cookies for business state.
- Use Services Registry (typed DI); no direct imports of shared adapters in modules.
- Use `defineRequest` + `HttpRequest`; return normalized envelopes (+ ETag/304 for stable GETs).
- Prisma `select` + typed pipes; schemas in `modules/*/schema/*.prisma` (run `pnpm prisma:collect`).
- Enforce JWT + policy for protected mutations; add tests; ensure lint and typecheck pass.

These guidelines ensure changes align with the architecture and remain safe, typed, and maintainable.

## Core Principles

- Follow the Services Registry: inject shared services (db, cache, logger, events, queue) via Services; do not import adapters directly in modules.
- Use the Request builder API: define Zod-based requests once with `defineRequest` and use `HttpRequest(RequestSpec)` in routes.
- Strict typing: no `any`. Prefer `unknown` and narrow via Zod or explicit transformations. Derive types from Prisma `select` rules and map with typed pipes.
- Module boundaries: only import across modules via `contracts/`, public `types.ts`, or the Services Registry. No deep imports.
- Prisma schemas are module-local: add `.prisma` under `modules/*/schema`, and run `pnpm prisma:collect` before generate/migrate.
- Routing location: Keep routable files (pages, route handlers) under `app/`. Use `modules/*/ui/components/*` for reusable UI fragments only.

### Runtime Choice (Edge vs Node)

- Edge handlers must be intentionally thin: validate, authorize, do simple reads/compute, return a response.
- Do NOT bind module boot logic, event listeners, job processors, or Node-only adapters in edge routes.
- If a handler needs events/queue/logger or direct DB TCP, keep it on Node (`export const runtime = 'node' | 'nodejs'`).
- If you pick edge with Prisma, you must use `@prisma/client/edge` and a proxy (Accelerate/Data Proxy). Otherwise, use Node.

### UI State

- Prefer server-first state: render via server components, mutate via server actions/handlers, revalidate after writes.
- Use client state only for ephemeral UI concerns; avoid global client stores by default.
- Cookies: allowed for auth/session and trivial preferences; never for business state (drafts, filters, workflow).

## When Adding or Modifying Code

- Services injection
  - Use `services.<module>.<api>` or shared services (`services.db`, `services.cache`, etc.).
  - Do not import `@/core/cache/*`, `@/core/logger/*`, `@/core/queue/*`, or `@/core/events/*` directly from modules.
- Handlers and requests
  - Create Zod specs with `defineRequest({ body, query, params })`.
  - Implement routes via `HttpRequest(RequestSpec)(opts, async function(){ const { body, query, params } = this.validate(); ... })`.
  - Return normalized envelopes using `ok(data, meta)` or `fail(error)`.
  - Consider ETag for stable GET list endpoints (use `core/http/etag.ts`) and return `304` on `If-None-Match`.
- Data access and outputs
  - Add Prisma `select` rules for each view in `modules/*/data/selects.ts`.
  - Convert to output shapes with typed pipes in `modules/*/domain/views.ts`; no DTO classes.
- Types
  - Export public types from `modules/*/types.ts` and aggregate in `modules/types.ts` if needed.
  - Use type-only imports.
- Events and jobs
  - Define event/job names and payload types under `modules/*/contracts` or colocated.
  - Register listeners/processors in the module `boot()` with `services.events` / `services.queue`.
  - Invalidate caches via event handlers when needed.
- Auth & policies
  - Use JWT (`jose`) for `auth: true` handlers and define policies under `modules/*/domain/policies/*`.
  - Enforce with `authorize(user, policy)`; return `forbid()` for failures.
- Rate limiting
  - Dev-only limiter available at `core/http/rate-limit.ts`; production should use KV/Redis-backed or vendor solutions.

## Testing

- Prefer unit tests with service injection and stubs for shared services.
- For integration tests, use Testcontainers and run migrations; seed data via fixtures.
- For HTTP handlers, validate the response envelope and expected `meta` (pagination) fields.

## Type Safety and Linting

- Enforce TypeScript strictness and ESLint rules noted in `documentation/architecture/22-type-safety.md`.
- Do not introduce `any`, `ts-ignore`, or unsafe operations. Narrow unknown via Zod.

## PR Checklist for AI Agents

- [ ] Runtime choice is correct (edge handlers are thin; Node for events/queue/logger/DB TCP).
- [ ] No direct imports of shared adapters from module code; Services Registry used.
- [ ] Requests use `defineRequest` + `HttpRequest` and return normalized envelopes.
- [ ] Prisma `select` rules + typed pipes used for outputs.
- [ ] Public types exported via module `types.ts`; global barrel updated if needed.
- [ ] Schema changes added under `modules/*/schema/*.prisma`; `prisma:collect` step documented/updated.
- [ ] Code passes TypeScript strict checks and ESLint (no-explicit-any, no-unsafe-\*, no-cycle).
- [ ] Tests updated/added for new service logic or handlers.
- [ ] For GET lists, ETag/304 considered when stable; for protected mutations, JWT + policy enforced.
- [ ] UI state is server-first; no cookies used for business state; client state kept ephemeral.
- [ ] Routable files live in `app/` (pages/routes/actions); `modules/*/ui` contains reusable components only.

## Common Mistakes (and Correct Patterns)

- Directly importing shared adapters (cache/logger/queue/events) in modules.
  - Wrong: `import { createClient } from '@/core/cache/redis'` inside a module.
  - Right: use `this.services.cache` (or `services.cache` in factories/boot).

- Bypassing the Request builder by inlining Zod per route or using legacy `controller`.
  - Wrong: `export const GET = controller({ body: z.object({}), ... })`.
  - Right: `const Req = defineRequest({ ... }); export const GET = HttpRequest(Req)({...}, async function(){ const { body } = this.validate(); ... });`

- Returning raw data without the normalized envelope.
  - Wrong: `return users;`
  - Right: `return ok(users, meta)` (use `pageMeta` for lists).

- Defining DTO classes to reshape Prisma results.
  - Wrong: `class UserDto { constructor(model){...} }`.
  - Right: Define Prisma `select` rules and map with typed pipes to view types.

- Using `any` or `ts-ignore` to silence type errors.
  - Wrong: `const db: any = ...; // @ts-ignore`.
  - Right: `const db: PrismaClient = ...;` or use `unknown` and narrow via Zod/typed transforms.

- Deep cross-module imports.
  - Wrong: `import { X } from '@/modules/other/domain/...'`.
  - Right: use `@/modules/other/contracts` or `this.services.other.<api>`.

- Forgetting to register events/jobs in `boot()`.
  - Wrong: defining handlers without wiring them.
  - Right: `registerUserEvents(services); registerJobProcessors(services);` in module `boot()`.

- Edge routes using node-only providers.
  - Wrong: using `@prisma/client` or Redis in edge handlers.
  - Right: keep such handlers on Node; or if truly edge, use `@prisma/client/edge` with a proxy and avoid Node-only adapters.
- Binding boot logic/listeners in edge routes.
  - Wrong: attaching event listeners or job processors in edge code paths.
  - Right: run module `boot()` only in Node runtime.
