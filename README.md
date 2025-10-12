# Next.js 15 Modular Boilerplate

- Modules-first architecture with typed Services Registry, normalized HTTP layer, Prisma multi-file schemas, Tailwind, Vitest, and Playwright.

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

## Structure

- `app/(modules)/*` — routes re-export module handlers
- `modules/*` — vertical slices (schema/domain/data/http/contracts/events/jobs)
- `core/*` — shared runtime (db/cache/queue/events/logger/http)
- `prisma/base.prisma` + `prisma/schemas/*` — multi-file Prisma

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
- Adapters: in-memory `cache`/`queue` with easy swap to Redis/SQS.
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
