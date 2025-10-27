# Test-Driven Development (TDD) in this Boilerplate

This project is wired for fast, focused testing with Vitest (unit/integration) and Playwright (E2E). The repo now enforces a light TDD policy locally via Git hooks and in CI via coverage thresholds.

## Why and What We Enforce

- Tests-first workflow: write or change tests alongside the code you change.
- Unit tests must pass locally before you push.
- Coverage thresholds (statements 80%, branches 70%, functions 80%, lines 80%) are enforced in CI and locally on pre-push.
- Commits that change `core/**` or `modules/**` without touching any tests will be rejected by the pre-commit hook.

## Commands

- `pnpm test` — run all tests once (Vitest).
- `pnpm test:watch` — TDD loop (watch mode).
- `pnpm test:unit` — only unit/integration under `modules/**` and `core/**`.
- `pnpm test:coverage` — unit tests with coverage; fails if thresholds are not met.
- `pnpm e2e` — run Playwright E2E tests (requires app running).

## Local Enforcement

Husky hooks:

- Pre-commit: formats and lints staged files, type-checks, ensures tests changed with source, then runs unit tests.
  - Bypass (not recommended): `git commit --no-verify`.
- Pre-push: lints with no warnings, type-checks, and runs tests with coverage (enforcing thresholds).

What the test-change guard checks:

- If your staged changes include non-test TS/TSX files in `core/**` or `modules/**`, you must also stage at least one test file (either `*.test.ts[x]` or anything under a `tests/` folder).

### Exempting files from the tests requirement

- Add globs (one per line) to a `.tdd-exempt` file at the repository root, or set `TDD_EXEMPT_GLOBS` env var (comma-separated globs).
- Supported wildcards: `*` (segment) and `**` (any depth).
- Examples:
  - `core/types/**/*.ts` — exclude types-only changes
  - `modules/**/interfaces/**/*.ts` — exclude interface barrel changes
  - `modules/users/ui/loaders.ts` — exclude a specific file

## Writing Tests

- Unit/Integration tests:
  - Place cross-cutting tests under `tests/unit/*.test.ts`.
  - Place module tests under `modules/<mod>/tests/unit/*.test.ts`.
  - Use helpers in `core/testing/*` for HTTP handlers/services.
- E2E tests:
  - Place under `modules/<mod>/tests/e2e/*.spec.ts`.
  - Start the app (`pnpm dev` or `pnpm start` after `pnpm build`) then run `pnpm e2e`.

## CI Enforcement

GitHub Actions run on every push and PR:

- Install deps, lint with zero warnings, type-check, and run unit tests with coverage.
- Coverage thresholds are enforced via `vitest.config.ts`.
- Coverage HTML is uploaded as an artifact for inspection.

## Practical TDD Flow

1. Write a failing test that describes the behavior.
2. Run `pnpm test:watch` and see it fail.
3. Implement the minimal code to make it pass.
4. Refactor with tests green.
5. Commit — hooks will format, lint, type-check, ensure tests accompany changes, and run unit tests.
6. Push — hooks run coverage locally; CI repeats without flakiness.

## Notes

- You can focus a single test with `it.only` or `describe.only` while in watch mode (don’t commit with `.only`).
- Prefer fast unit tests for most behavior. Use E2E sparingly for critical user flows.
- If you absolutely must commit without tests (e.g., docs-only, build fix), use `--no-verify` once and add tests in a follow-up.
