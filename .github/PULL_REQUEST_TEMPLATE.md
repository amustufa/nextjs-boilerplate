## Context

Describe the problem, motivation, and any related issues.

## Changes

- Summarize what changed at a high level.

## Test Plan

- Unit: commands run, green? `pnpm test` / `pnpm test:unit`
- Coverage: thresholds met? `pnpm test:coverage`
- E2E (if applicable): app started and specs passing? `pnpm build && pnpm start` then `pnpm e2e`

## Risks / Impact

- Any migrations, feature flags, rollout concerns, or cross-module impact.

## Docs / Follow-ups

- Updated docs (README, AGENTS.md, documentation/TDD.md)?
- Follow-up tasks, tickets, or cleanup.

---

### Checklist

- [ ] Tests added/updated for all changes (TDD)
- [ ] Lint/typecheck pass locally (`pnpm check` or `pnpm lint && pnpm typecheck`)
- [ ] Unit tests pass locally (`pnpm test`)
- [ ] Coverage thresholds met locally (`pnpm test:coverage`)
- [ ] E2E passing when UI/route changes are made
- [ ] Docs updated (README/AGENTS/TDD) when needed
