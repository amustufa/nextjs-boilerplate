# Module Boundaries

- Cross-module imports allowed only via `contracts/` and public services; deep imports and cycles are forbidden.
- Contracts expose only interfaces/types; implementations are private to the module.
- Enforce with lint rules (and optionally TS project references in monorepos).

## ESLint Guidance (examples)

```json
// .eslintrc.cjs (excerpt)
module.exports = {
  rules: {
    // forbid deep imports across modules; allow only contracts and public barrels
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '@/modules/*/!(contracts)/**', // anything not under contracts
              '!@/modules/types',           // allow public types barrel
            ],
            message: 'Import only via contracts/ or public barrels (services/types).',
          },
        ],
      },
    ],
    // optional: prevent cycles
    'import/no-cycle': ['error', { ignoreExternal: true }],

    // forbid direct imports of core singletons/adapters from modules; require Services
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: [
              '@/core/cache/**',
              '@/core/logger/**',
              '@/core/queue/**',
              '@/core/events/**',
            ],
            message: 'Access shared services via the Services Registry (services.cache, services.logger, etc.), not by direct import.',
          },
        ],
      },
    ],
  },
};
```
