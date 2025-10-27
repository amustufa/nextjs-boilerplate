# AGENTS Guide (Codex/LLM)

This document is a drop-in guide for Codex agents working on this repository. It explains the project architecture, the rules to follow, how TDD is enforced, and the expected workflow in real projects.

## Do / Don’t

- Do: Write tests first (TDD). Every source change in `core/**` or `modules/**` must have a related test change.
- Do: Keep handlers thin and route-only code under `app/`.
- Do: Use the Services Registry from modules; wire adapters via `core/*`.
- Do: Validate inputs and return normalized envelopes from HTTP handlers.
- Do: Respect coverage thresholds and keep tests fast and deterministic.
- Don’t: Import Prisma directly from controllers/handlers; call services instead.
- Don’t: Add stateful logic in edge runtime; keep Node-only concerns (DB, queues, events) on Node.
- Don’t: Bypass pre-commit or pre-push hooks unless truly necessary (docs-only, urgent build fix).

## Project Overview

- Framework: Next.js 15 (app router), TypeScript.
- Testing: Vitest (unit/integration), Playwright (E2E).
- Data: Prisma (multi-file schemas), Postgres recommended.
- Runtime adapters: cache, queue, jobs, events, lock, storage, logger under `core/`.
- Modules: vertical slices under `modules/<mod>` with domain/services/http/interfaces/events/jobs/schema.

### Key Paths

- `app/(modules)/*`: route entries (pages, route handlers, server actions only here).
- `modules/*`: per-module logic; do not import adapters directly—use services.
- `core/*`: cross-cutting runtime, HTTP helpers, adapters, testing utilities.
- `prisma/*`: base schema + collected module schemas.
- `tests/unit/*` and `modules/*/tests/*`: unit and E2E tests.

## TDD & Enforcement

Local hooks via Husky:

- Pre-commit: `lint-staged` → typecheck → ensure tests changed → run unit tests.
- Pre-push: `lint:ci` (no warnings) → typecheck → unit tests with coverage.

Guard script: `scripts/ensure-tests-changed.ts` blocks commits that modify non-test TS/TSX in `core/**` or `modules/**` unless at least one test file is staged (`*.test.ts[x]` or files under any `tests/` folder).

Coverage thresholds enforced in `vitest.config.ts`:

- statements: 80%, branches: 70%, functions: 80%, lines: 80%.

CI (GitHub Actions): `.github/workflows/ci.yml` runs lint, typecheck, unit tests + coverage, and a separate E2E job that builds, starts the app, and runs Playwright tests.

Exempting files from tests requirement:

- Use `.tdd-exempt` at repo root with one glob per line, or `TDD_EXEMPT_GLOBS` env var.
- Wildcards: `*` for a single path segment, `**` for any depth.
- Typical exemptions: `core/types/**/*.ts`, `modules/**/interfaces/**/*.ts`, or a specific path.

## Commands

- Install: `pnpm install`
- Lint / fix: `pnpm lint`, `pnpm lint:fix` (CI uses `pnpm lint:ci`)
- Types: `pnpm typecheck`
- Tests: `pnpm test`, `pnpm test:watch`, `pnpm test:coverage`
- Unit-only shorthand: `pnpm test:unit`, `pnpm test:unit:watch`
- E2E: `pnpm e2e` (requires app running); install browsers with `pnpm e2e:install`
- Prisma: `pnpm prisma:collect`, `pnpm prisma:migrate`, `pnpm prisma:generate`, `pnpm db:reset`, `pnpm db:seed`

## How To Work (Step-by-step)

1. Plan and write a failing test

- Place tests under `tests/unit/*.test.ts` for cross-cutting code, or `modules/<mod>/tests/unit/*.test.ts` for module code.
- For HTTP handlers, use helpers under `core/testing/` (`runHandler`, `setTestServices`, `createMockServices`).

2. Implement minimal code to pass

- Modify files under `core/**` or `modules/**` as needed. Keep app-facing code in `app/**` thin and delegating to services.

3. Refactor

- Keep tests green. Improve types, factor out helpers, and maintain module boundaries.

4. Commit & push

- Pre-commit will require tests with source changes and run unit tests.
- Pre-push will enforce lint, typecheck, and coverage.

5. CI validation

- GitHub Actions repeat lint/typecheck/unit with coverage; E2E job builds app, starts it, and runs Playwright.

## HTTP Conventions

- Define handlers with normalized envelopes: `{ ok: boolean, data?, error?, meta? }` using helpers from `core/http/*`.
- Validate inputs with Zod; return 422 for validation failures.
- Use ETag helpers for stable GET responses that can be 304’ed when unchanged.
- Apply authorization via `core/http/auth` + module policies.

## Runtime Guidance

- Edge: only lightweight validation/authorize/read/compute; no DB TCP or heavy adapters.
- Node: services with Prisma, events, queues, logger, jobs, storage.
- Set `export const runtime = 'edge' | 'node'` at route level as needed.

## Data & Seeding

- Place module schemas in `modules/<mod>/schema/*.prisma`. Run `pnpm prisma:collect` before `migrate` or `generate`.
- Seeders: `modules/<mod>/seeds/*.seed.ts` with `{ name, order?, tags?, run(ctx) }`. Run `pnpm db:seed`.
- Factories: keep simple faker-based factories next to seeds.

## Testing Patterns

- Unit tests: Vitest with globals enabled. Prefer pure functions; mock adapters via `createMockServices` when needed.
- HTTP tests: use `runHandler` to invoke route handlers with mock requests and inspect envelopes/status/headers.
- E2E tests: place under `modules/<mod>/tests/e2e/*.spec.ts`; run app, then `pnpm e2e`.

## Quality Bar

- Lint and typecheck must pass.
- Unit tests must pass and meet coverage thresholds.
- Keep tests stable and fast; avoid real network/DB unless explicitly required.
- Follow existing code style and minimal changes principle.

## Bypassing Hooks

- Only when absolutely necessary (docs-only, emergency fix) and with follow-up tests ASAP: `git commit --no-verify`.

## Contact Surface

- See `README.md` for structure overview and `documentation/TDD.md` for deeper TDD guidance.
