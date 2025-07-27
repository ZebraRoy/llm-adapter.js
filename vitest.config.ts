import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/coverage/**',
      ]
    },
  },
  resolve: {
    alias: {
      // Handle .js imports in TypeScript files
      '~/': new URL('./src/', import.meta.url).pathname,
    },
  },
}); 