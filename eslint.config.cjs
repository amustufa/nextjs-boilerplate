// Flat ESLint config for ESLint v9, migrated from .eslintrc.cjs
// Uses FlatCompat to keep existing extends/plugins/settings working.
// See: https://eslint.org/docs/latest/use/configure/migration-guide

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/', '.next/', 'dist/', 'coverage/', 'eslint.config.cjs', '.eslintrc.cjs', 'postcss.config.js'] },
  // Global environment
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  // Controllers/HTTP handlers must not use Prisma directly
  {
    files: ['app/**/route.{ts,tsx}', 'modules/**/http/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['@prisma/client', '@prisma/client/edge', 'pino'],
          patterns: ['@/core/db/**'],
          message: 'Controllers must access the DB via Services; do not import Prisma or core/db here.',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='prisma']",
          message: 'Controllers must use services; no direct `prisma` usage in controllers.',
        },
      ],
    },
  },
  // Boundaries: keep layers isolated (UI -> HTTP -> Domain/Data; App -> HTTP/UI; Core runtime not directly in UI)
  {
    settings: {
      'boundaries/elements': [
        { type: 'core-runtime', pattern: 'core/runtime/**' },
        { type: 'core-adapters', pattern: 'core/{cache,queue,events,jobs,lock,storage,logger}/**' },
        { type: 'core-http', pattern: 'core/http/**' },
        { type: 'module-domain', pattern: 'modules/*/domain/**' },
        { type: 'module-data', pattern: 'modules/*/data/**' },
        { type: 'module-http', pattern: 'modules/*/http/**' },
        { type: 'module-ui', pattern: 'modules/*/ui/**' },
        { type: 'module-tests', pattern: 'modules/*/tests/**' },
        { type: 'app', pattern: 'app/**' },
      ],
    },
    plugins: {
      boundaries: require('eslint-plugin-boundaries'),
    },
    rules: {
      // Default allow to avoid conflicts; explicitly restrict key flows
      'boundaries/element-types': [
        'error',
        {
          default: 'allow',
          rules: [
            // UI should not import adapters or module internals; allow runtime for server loaders
            { from: 'module-ui', disallow: ['core-adapters', 'module-domain', 'module-data'] },
            // App can access core runtime services (e.g., server actions) but not adapters or module internals
            { from: 'app', disallow: ['core-adapters', 'module-domain', 'module-data'] },
            // HTTP must not import core runtime/adapters directly
            { from: 'module-http', disallow: ['core-runtime', 'core-adapters'] },
          ],
        },
      ],
    },
  },
  // Discourage unnecessary `unknown` in module domain/data/http layers
  {
    files: [
      'modules/**/domain/**/*.{ts,tsx}',
      'modules/**/data/**/*.{ts,tsx}',
      'modules/**/http/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: ['pino'] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSUnknownKeyword',
          message:
            'Avoid `unknown` in application layers; prefer concrete types and narrow at the boundary with Zod.',
        },
      ],
    },
  },
  // App directory: disallow inline object types in exported signatures too
  {
    files: ['app/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: ['pino'] },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: [
            'ExportNamedDeclaration > FunctionDeclaration > TSTypeAnnotation TSTypeLiteral',
            'ExportNamedDeclaration VariableDeclaration VariableDeclarator > TSTypeAnnotation TSTypeLiteral',
            'ExportNamedDeclaration ClassDeclaration MethodDefinition > TSTypeAnnotation TSTypeLiteral',
            "ExportNamedDeclaration :matches(FunctionDeclaration, VariableDeclarator, MethodDefinition) TSTypeReference[ typeName.name='Promise' ] TSTypeParameterInstantiation > TSTypeLiteral",
          ].join(', '),
          message:
            'Use named types or a shared generic (e.g., Result<...>) in exported signatures; avoid inline object types in app/ as well.',
        },
      ],
    },
  },
  // UI structure enforcement: components/fragments/forms must be props-only (no services/fetch/cookies/revalidate)
  {
    files: [
      'modules/**/ui/components/**/*.{ts,tsx}',
      'modules/**/ui/fragments/**/*.{ts,tsx}',
      'modules/**/ui/forms/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['pino'],
          patterns: [
            {
              group: [
                '@/core/**',
                '@/core/runtime/**',
                '@/modules/*/domain/**',
                '@/modules/*/data/**',
              ],
              message:
                'UI components/fragments/forms must not import core runtime or module domain/data. Accept props only and compose.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.name='fetch']", message: 'Do not fetch in UI components/fragments/forms. Use server loaders.' },
        { selector: "CallExpression[callee.name='cookies']", message: 'Do not access cookies in UI; pass data via props.' },
        { selector: "CallExpression[callee.name='revalidatePath']", message: 'Do not call revalidate APIs in UI; use server actions.' },
        { selector: "CallExpression[callee.name='revalidateTag']", message: 'Do not call revalidate APIs in UI; use server actions.' },
      ],
    },
  },
  // UI loaders: server-only, no JSX, no 'use client'
  {
    files: [
      'modules/**/ui/loaders.{ts,tsx}',
      'modules/**/ui/loaders/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: "ExpressionStatement[directive='use client']", message: 'UI loaders must be server-only. Remove \"use client\".' },
        { selector: 'JSXElement', message: 'UI loaders must not render JSX.' },
        { selector: 'JSXFragment', message: 'UI loaders must not render JSX.' },
      ],
    },
  },
  // UI hooks: client-only data fetching is allowed here (React Query/SWR/custom)
  // Still forbid core/runtime and domain/data imports; discourage cookies/revalidate in hooks
  {
    files: [
      'modules/**/ui/hooks/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['pino'],
          patterns: [
            {
              group: [
                '@/core/**',
                '@/core/runtime/**',
                '@/modules/*/domain/**',
                '@/modules/*/data/**',
              ],
              message:
                'UI hooks must not import core runtime or module domain/data. Call API routes; hydrate from server loaders.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "CallExpression[callee.name='cookies']", message: 'Do not access cookies in UI hooks; use headers/auth and server loaders.' },
        { selector: "CallExpression[callee.name='revalidatePath']", message: 'Do not call revalidate APIs in UI hooks; use server actions.' },
        { selector: "CallExpression[callee.name='revalidateTag']", message: 'Do not call revalidate APIs in UI hooks; use server actions.' },
      ],
    },
  },
  // UI: no inline object types in exported signatures/props
  {
    files: ['modules/**/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: [
            'ExportNamedDeclaration > FunctionDeclaration > TSTypeAnnotation TSTypeLiteral',
            'ExportNamedDeclaration VariableDeclaration VariableDeclarator > TSTypeAnnotation TSTypeLiteral',
            'ExportNamedDeclaration ClassDeclaration MethodDefinition > TSTypeAnnotation TSTypeLiteral',
            "ExportNamedDeclaration :matches(FunctionDeclaration, VariableDeclarator, MethodDefinition) TSTypeReference[ typeName.name='Promise' ] TSTypeParameterInstantiation > TSTypeLiteral",
          ].join(', '),
          message:
            'Use a named type/interface exported via the module types barrel instead of inline object types in exported UI signatures.',
        },
      ],
    },
  },
  // Module APIs (domain/data/http): enforce named types in exported signatures
  {
    files: [
      'modules/**/domain/**/*.{ts,tsx}',
      'modules/**/data/**/*.{ts,tsx}',
      'modules/**/http/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: [
            'ExportNamedDeclaration > FunctionDeclaration > TSTypeAnnotation TSTypeLiteral',
            'ExportNamedDeclaration VariableDeclaration VariableDeclarator > TSTypeAnnotation TSTypeLiteral',
            'ExportNamedDeclaration ClassDeclaration MethodDefinition > TSTypeAnnotation TSTypeLiteral',
            "ExportNamedDeclaration :matches(FunctionDeclaration, VariableDeclarator, MethodDefinition) TSTypeReference[ typeName.name='Promise' ] TSTypeParameterInstantiation > TSTypeLiteral",
          ].join(', '),
          message:
            'Exported APIs must use named types/interfaces; avoid inline object types (e.g., Promise<{ ... }>). Define types under domain/projections or module types barrel.',
        },
      ],
    },
  },
  // Base JS/TS config without TS-typed rules (applies to all files)
  ...compat.config({
    plugins: ['import-x', '@next/eslint-plugin-next'],
    extends: [
      'eslint:recommended',
      'plugin:import-x/recommended',
      'plugin:@next/next/recommended',
      'prettier',
    ],
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          project: ['./tsconfig.json'],
        },
        node: {
          extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
          preferBuiltins: true,
        },
      },
      // Back-compat key in case plugin reads the old namespace
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.json'],
        },
        node: {
          extensions: ['.js', '.cjs', '.mjs', '.ts', '.tsx'],
          preferBuiltins: true,
        },
      },
    },
    rules: {
      'import-x/no-cycle': ['error', { ignoreExternal: true }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modules/*/!(interfaces)/**', '!@/modules/types'],
              message: 'Import only via interfaces/ or public barrels (services/types).',
            },
            {
              group: [
                '@/core/cache/**',
                '@/core/logger/**',
                '@/core/queue/**',
                '@/core/events/**',
              ],
              message: 'Access shared services via the Services Registry, not direct imports.'
            }
          ]
        }
      ],
    },
  }),
  // Enable typed linting for TS files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: require('@typescript-eslint/parser'),
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': require('@typescript-eslint/eslint-plugin'),
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  // Enforce named types for exported signatures in modules (no inline object types)
  {
    files: ['modules/**/domain/**/*.ts', 'modules/**/data/**/*.ts', 'modules/**/http/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: [
            // export function foo(): {...}
            'ExportNamedDeclaration > FunctionDeclaration > TSTypeAnnotation TSTypeLiteral',
            // export const foo = (..): {...} =>
            'ExportNamedDeclaration VariableDeclaration VariableDeclarator > TSTypeAnnotation TSTypeLiteral',
            // export class S { method(...): {...} }
            'ExportNamedDeclaration ClassDeclaration MethodDefinition > TSTypeAnnotation TSTypeLiteral',
            // Promise<{...}> in exported returns
            "ExportNamedDeclaration :matches(FunctionDeclaration, VariableDeclarator, MethodDefinition) TSTypeReference[ typeName.name='Promise' ] TSTypeParameterInstantiation > TSTypeLiteral",
          ].join(', '),
          message:
            "Use a named type/interface from the module’s types barrel instead of an inline object type in exported signatures.",
        },
      ],
    },
  },
  // Allow runtime service wiring to import adapters directly
  {
    files: ['core/runtime/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // Allow logger adapter to import pino directly
  {
    files: ['core/logger/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // Relax unsafe rules in test files for practicality
  {
    files: ['**/tests/**/*.test.ts'],
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
