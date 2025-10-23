# Next.js 15 Modular Boilerplate

- Modules-first architecture with typed Services Registry, normalized HTTP layer, Prisma multi-file schemas, Tailwind, Vitest, and Playwright.

## AI Agents

- Please read the project guide for AI agents before making changes: `documentation/instructions/for-ai-agents.md`.
- Two key rules we enforce:
  - Controllers must not use Prisma directly; call services instead.
  - Avoid `unknown` where not necessary; prefer concrete types and narrow at boundaries with Zod.

## Quick Start

- Copy `.env.example` to `.env` and set `DATABASE_URL` (Postgres).
- Install deps: `pnpm install`
- Generate Prisma client: `pnpm prisma:generate`
- Dev server: `pnpm dev`

## Scripts

- `pnpm prisma:collect` — symlink module `.prisma` files into `prisma/schemas/`
- `pnpm prisma:migrate` — collect + run `prisma migrate dev --schema prisma`
- `pnpm prisma:generate` — collect + run `prisma generate --schema prisma`
- `pnpm lint` / `pnpm typecheck`
- `pnpm test` (Vitest) / `pnpm test:ui` (Playwright)
- `pnpm jobs:stats` / `pnpm jobs:cancel` / `pnpm jobs:stats:sqs` — job maintenance CLIs
- `pnpm db:seed` — run modular seeders (see Seeding)
- `pnpm db:reset` — reset database then seed
- `pnpm module:generate` — interactive module scaffolder

## Structure

- `app/(modules)/*` — routes re-export module handlers
- `modules/*` — vertical slices (schema/domain/data/http/contracts/events/jobs)
- `core/*` — shared runtime (db/cache/queue/events/logger/http)
- `prisma/base.prisma` + `prisma/schemas/*` — multi-file Prisma

### Seeding

- Seeders live under `modules/<module>/seeds/*.seed.ts` (and optional `seeds/global/*.seed.ts`).
- Each seeder exports a default object `{ name, order?, tags?, run(ctx) }`.
- Run all: `pnpm db:seed`. Preview: `pnpm db:seed --preview`.
- Target modules: `pnpm db:seed --only users,posts`. Filter by tags: `--tags dev`.
- Safety: refuses on production unless `--force`. Supports `--continue` to keep going after failures.
- Example: see `modules/users/seeds/001_users.seed.ts`.

Factories

- Minimal faker-based factories can live alongside seeds, e.g. `modules/users/seeds/factories/user.factory.ts`.
- Example bulk users: `modules/users/seeds/002_users_bulk.seed.ts` (uses `@faker-js/faker`).
- Customize count via `SEED_USERS_COUNT=50 pnpm db:seed --tags dev`.

Routing Note

- Routable files (pages, route handlers, and route-local Server Actions) must live under `app/`.
- Use `modules/*/ui/components/*` for reusable UI and compose them in `app/*` routes.

### Prisma Schema Convention

- Place module-local Prisma schemas in `modules/<module>/schema/*.prisma` (e.g., `modules/users/schema/user.prisma`).
- The collector script symlinks all `modules/**/schema/*.prisma` into `prisma/schemas/` for Prisma CLI.

## Checklist TL;DR

- Routable files live in `app/` (pages/routes/server actions); reusable UI components live in `modules/*/ui/components/*`.
- Edge handlers are thin; keep events/queue/logger/DB TCP on Node; module boot runs only on Node.
- Server-first UI: render in server components; mutate via server actions/handlers; keep client state ephemeral; no cookies for business state.
- Use the Services Registry (typed DI) from modules; do not import core adapters (cache/logger/queue/events) directly in module code.
- Use `defineRequest` + `HttpRequest` and return normalized envelopes; consider ETag/304 for stable GET lists.
- Derive outputs from Prisma `select` + typed pipes; schemas live in `modules/*/schema/*.prisma` (run `pnpm prisma:collect` before migrate/generate).
- Protect mutations with JWT + policy; add tests for new logic/handlers; ensure lint and typecheck pass.

## Notes

- Dual runtime: set `export const runtime = 'edge' | 'node'` per route; services bind edge-safe Prisma when needed.
- Adapters: provider-agnostic `cache`/`queue`/`jobs`/`lock` with env-driven backends (Redis/BullMQ/SQS).
- Auth: omitted initially; wire in `core/http` and services when ready.

### Runtime Guidance (Edge vs Node)

- Edge handlers must be thin: validate, authorize (JWT), simple reads/compute, return a response. Do not bind module boot logic, event listeners, job processors, or Node-only adapters in edge.
- Keep any handler needing events/queue/logger or direct DB TCP on Node (`runtime = 'node' | 'nodejs'`).
- If using Prisma on edge, use `@prisma/client/edge` with a proxy (Accelerate/Data Proxy). Otherwise, keep DB-bound handlers on Node.

## Users Module Demo Routes

- `/users` — server component + server action (Services-based), SPA-like.
- `/users/server-action` — explicit server action variant (Services-based).
- `/users/api-example` — server action proxy that calls the API handler; page reads via API.
- `/users/server-action-redirect` — PRG variant; server action revalidates then `redirect()` to avoid returning RSC payload and prevent resubmits.
- `/users/client-hook` — server renders initial list; client fragment uses `useUsersQuery` to fetch from `/users/api` and keep data fresh.

## Further Reading

- Developer Guide: documentation/developer-guide.md
- Providers & Examples: documentation/providers-and-examples.md
- Production Setup: documentation/production-setup.md
- To generate a new module with seed/HTTP/service stubs, run `pnpm module:generate` and follow prompts.
