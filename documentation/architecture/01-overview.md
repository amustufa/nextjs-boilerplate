# Overview

## Goals & Principles

- Module-first: Each business capability lives in a self-contained module (routes, UI, domain, data, policies, translations, tests).
- Clear boundaries: Modules talk via contracts, not ad-hoc imports.
- Replaceable infrastructure: Swap DB/queue/cache providers via core.
- Zero magic: Embrace Next.js conventions while adding just enough structure.
- DX: Scaffolders, consistent tooling, per-module tests, storybook, strict type safety.

## High-level Directory Layout

```
.
├─ app/                               # Next.js App Router
│  ├─ (public)
│  └─ (modules)/                      # Route groups re-export from modules
│     ├─ users/
│     │  ├─ page.tsx
│     │  └─ api/route.ts
│     └─ billing/
├─ modules/                           # Domain modules
│  ├─ users/
│  │  ├─ ui/
│  │  ├─ http/
│  │  ├─ domain/
│  │  ├─ schema/                      # Prisma schemas (module-local *.prisma)
│  │  ├─ data/
│  │  ├─ contracts/
│  │  ├─ i18n/
│  │  ├─ tests/
│  │  └─ index.ts
│  ├─ billing/
│  ├─ types.ts                        # module type barrel (export type only)
│  └─ ...
├─ core/
│  ├─ config/
│  ├─ container/
│  ├─ db/
│  ├─ http/
│  ├─ events/
│  ├─ queue/
│  ├─ cache/
│  ├─ logger/
│  ├─ types.ts                        # core type barrel (export type only)
│  └─ module.ts
├─ prisma/                            # Prisma v6.7 multi-file (merged) + migrations
│  ├─ base.prisma                     # datasource + generator only
│  └─ schemas/                        # collected module-local *.prisma (generated)
├─ scripts/
│  ├─ new-module.ts
│  └─ dev-tools/*
├─ tests/
├─ .env.example
└─ package.json

## Type Barrels
- Each module exposes a `types.ts` barrel re-exporting its public types.
- The global `modules/types.ts` aggregates from all module barrels for convenience.
```

### Why `(modules)` route group?

- Keeps routing concerns distinct from domain code while leveraging App Router.
- Thin route files re-export module handlers so modules own logic and tests.

### Edge vs Node routes (guidance)

- Use edge for thin handlers only (validation, auth, simple reads via edge-safe providers). Do not bind module boot logic, event listeners, or job processors in edge.
- Keep any handler that needs events/queue/logger or direct DB TCP on Node.

### UI State

- Server-first: render in server components; mutate via server actions/handlers; revalidate to update views.
- Client state only for ephemeral UI; avoid global stores by default.
- Cookies are allowed for auth/session and trivial preferences, but never for business state, drafts, filters, or workflow state.
