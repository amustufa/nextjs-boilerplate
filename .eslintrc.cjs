/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import', '@next/eslint-plugin-next'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:@next/next/recommended',
    'prettier'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  settings: {
    'import/resolver': {
      typescript: true,
      node: true
    }
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }],
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    'import/no-cycle': ['error', { ignoreExternal: true }],
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
    ]
  }
};
