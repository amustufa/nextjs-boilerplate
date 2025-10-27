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
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80,
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
      ],
    },
  },
});
