# Testing & Tooling

## Testing Strategy

- Unit (Vitest): token/service overrides and entity factories.
- Integration: Testcontainers for DB; apply migrations and seed fixtures; assert repository behavior and cross-module flows.
- HTTP: invoke request handlers (HttpRequest) with mock Request/params and assert the normalized envelope, traceId, and status.
- E2E (Playwright): user flows across modules.
- Contract tests: enforce Zod schemas for inputs/outputs.

### Test placement

- Module tests live next to code: `modules/<module>/tests/{unit|integration|e2e}/*.test.ts`.
- Core-only tests live under the root `tests/` directory.
- Playwright is configured to discover module e2e tests under `modules/**/tests/e2e/**/*.spec.ts`.

## Tooling

- ESLint + Prettier + TS strict, path aliases.
- Husky + lint-staged; Changesets if publishing modules.
- Storybook for components.
- Scaffolder for modules and usecases.
