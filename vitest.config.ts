import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@/': `${path.resolve(__dirname, '.')}/`,
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'modules/**/tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['core/**/*.ts', 'modules/**/*.ts'],
      thresholds: {
        statements: 60,
        branches: 50,
        functions: 60,
        lines: 60,
      },
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/.next/**',
        '**/tests/**',
        '**/*.d.ts',
        'app/**',
        'eslint.config.cjs',
        '.eslintrc.cjs',
        'next.config.ts',
        'playwright.config.ts',
        'postcss.config.js',
        'tailwind.config.ts',
        'vitest.config.ts',
        // exclude infra/provider-specific or boot/runtime glue that is hard to unit test
        'core/db/**',
        'core/runtime/**',
        'core/storage/**',
        'core/cache/redis.ts',
        'core/lock/redis.ts',
        'core/queue/bullmq.ts',
        'core/jobs/bullmq.ts',
        'core/jobs/bullmq-shared.ts',
        'core/jobs/sqs.ts',
        // exclude UI and seeds from coverage
        'modules/**/ui/**',
        'modules/**/seeds/**',
        // optionally exclude module jobs if integration tested elsewhere
        'modules/**/jobs/**',
      ],
    },
  },
});
