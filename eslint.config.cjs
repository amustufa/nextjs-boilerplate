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
  { ignores: ['node_modules/', '.next/', 'dist/', 'eslint.config.cjs', '.eslintrc.cjs', 'postcss.config.js'] },
  // Global environment
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
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
              group: [
                '@/modules/*/!(contracts)/**',
                '!@/modules/types',
              ],
              message: 'Import only via contracts/ or public barrels (services/types).',
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
  // Allow runtime service wiring to import adapters directly
  {
    files: ['core/runtime/**'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  // Relax unsafe rules in test files for practicality
  {
    files: ['**/tests/**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
