# Type Safety

Strong type safety is enforced across the codebase by configuration and linting. This prevents accidental `any` and unsafe patterns.

## TypeScript Settings

```json
// tsconfig.json (excerpt)
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "useUnknownInCatchVariables": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitOverride": true,
    "importsNotUsedAsValues": "error"
  }
}
```

## ESLint Rules

```js
// .eslintrc.cjs (excerpt)
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    'import/no-cycle': ['error', { ignoreExternal: true }],
  },
};
```

## Patterns to Prefer

- Use Zod schemas at the boundary to narrow unknown into typed values; never trust untyped input.
- Use `unknown` instead of `any`. Parse/validate to concrete types using Zod or by constructing typed objects.
- For Prisma, import and use `PrismaClient` type for `services.db`, not `any`.
- Derive types from Prisma `select` rules (via `Prisma.UserGetPayload<{ select: ... }>`), then convert with typed pipes.
- Use type-only imports (`import type { X } from '...'`) for pure types to avoid runtime coupling.
- Expose public types via module-level barrels and aggregate them in the global `modules/types.ts` if needed.

## Prohibited Practices

- `as any`, `any`-typed parameters/fields, or ts-ignore comments without explanation.
- Direct imports of core shared adapters (cache/logger/queue/events) from module code; obtain them via the Services Registry.
- Deep imports across modules (bypass contracts/services/type barrels).

## Allowed Exceptions

- Very narrow scope ts-expect-error with a descriptive reason and a follow-up action; prefer refactoring.
