# Contributing Guide

## Checklist TL;DR

- Runtime is correct: Edge handlers are thin; Node for events/queue/logger/DB TCP.
- Routable files under `app/`; reusable UI under `modules/*/ui/components/*`.
- Server-first UI: server components + server actions; client state kept ephemeral.
- Services Registry used (typed DI); no direct imports of shared adapters from modules.
- Requests use `defineRequest` + `HttpRequest`; responses use normalized envelopes.
- Outputs come from Prisma `select` + typed pipes (no DTO classes).
- Prisma schemas under `modules/*/schema/*.prisma`; run `pnpm prisma:collect` before migrate/generate.
- Tests updated for new logic/handlers; lint and typecheck pass.
- Consider ETag/304 for stable GET lists; enforce JWT + policy for protected mutations.

## Core Concepts

- Services Registry (typed DI): Modules register public APIs under `services.<module>.<name>`; controllers receive a typed services object.
- Module-local Prisma schemas: Place `.prisma` files under `modules/*/schema`. Use `pnpm prisma:collect` to symlink them into `prisma/schemas/` before running Prisma.
- Output shaping with select + pipes: Define Prisma `select` per endpoint/view and convert with typed pipes (no DTO classes).
- Module boundaries: Import across modules only via `contracts/` and public type barrels; enforce with ESLint rules.
- Type barrels: Each module has its own `types.ts`. The global `modules/types.ts` aggregates all module type barrels.
- Request builder: Define Zod specs once with `defineRequest` and use `HttpRequest(RequestSpec)(opts, handler)` to implement routes.
- Routing location: pages and route handlers must live under `app/`. Use `modules/*/ui/components/*` for reusable UI only; compose them in `app/*` routes.
  - UI structure in `modules/<name>/ui`:
    - `components/`, `fragments/`, `forms/` are props-only and must not import Services/core/domain/data or use fetch/cookies/revalidate.
    - `loaders/` are server-only helpers (no JSX) and may use `getServices`.
- Normalized envelopes: Return `{ ok, data?, error?, meta? }`; include pagination meta for list endpoints.

## Runtime Choice (Edge vs Node)

- Edge handlers must be intentionally thin: validate, authorize (JWT), perform simple reads/compute, return a response.
- Do NOT bind module boot logic, event listeners, job processors, or Node-only adapters in edge routes.
- If a handler needs events/queue/logger or direct DB TCP, keep it on Node (`export const runtime = 'node' | 'nodejs'`).
- If you choose edge with Prisma, you must use `@prisma/client/edge` with a proxy (Accelerate/Data Proxy). Otherwise, keep DB-bound handlers on Node.

## Server-First UI State

- Render via server components and use server actions/handlers for mutations.
- Keep client state ephemeral (inputs, UI toggles); avoid client global stores by default.
- Cookies are allowed for auth/session and trivial preferences only; do not store business state, drafts, filters, or workflow state in cookies.

## Commands

- `pnpm prisma:collect`: Collect module-local `.prisma` into `prisma/schemas/`.
- `pnpm prisma:migrate`: Collect + run migrations with `--schema prisma`.
- `pnpm prisma:generate`: Collect + generate Prisma client with `--schema prisma`.

## Adding a Module

1. Scaffold `modules/<name>` with `ui`, `http`, `domain`, `data`, `contracts`, `tests`, `i18n`, and `types.ts`.
2. Add `schema/*.prisma` files if needed.
3. Register public API in `index.ts` using the Services Registry (`services.namespace('<name>', ...)`).
4. Define select rules and typed pipes under `data/selects.ts` and `domain/views.ts`.
5. Add events under `events/*` and jobs under `jobs/*`, and register them in `boot()` (Node runtime only).
6. Export public types via `types.ts`; update the global `modules/types.ts` aggregator.
7. Reusable UI goes in `modules/<name>/ui/components/*`. Route files and Server Actions go under `app/`.

## PR Checklist

- Runtime is correct (edge handlers are thin; Node for events/queue/logger/DB TCP).
- No deep cross-module imports; only via contracts/types/services.
- Requests use `defineRequest` + `HttpRequest` and return normalized envelopes.
- Outputs come from Prisma `select` + typed pipes (no DTO classes).
- Public types exported via module `types.ts`; update global `modules/types.ts` if needed.
- Prisma schema changes under `modules/*/schema/*.prisma`; run `pnpm prisma:collect` before generate/migrate.
- Tests cover service logic and endpoints; assert envelope shape and pagination meta.
- Consider ETag/304 for stable GET lists; enforce JWT + policy for protected mutations.
- UI is server-first; no cookies used for business state; client state remains ephemeral.
- No inline object types in exported signatures (services/repos/http); use named types/interfaces exported via the module types barrel.
- UI placement/rules:
  - Routable files in `app/`; UI in `modules/*/ui`.
  - Components/fragments/forms do not use Services/fetch/cookies/revalidate.
  - Loaders are server-only and contain no JSX.
  - Client data fetching is allowed only in `modules/*/ui/hooks/*` (React Query/SWR/custom fetch) for smoother UX; hydrate from server loaders.

## Linting and Config Policy

- Do not change ESLint, Prettier, or TypeScript compiler options unless explicitly requested by the maintainers.
- Avoid relaxing rules to make code pass; prefer fixing code to satisfy existing rules.
