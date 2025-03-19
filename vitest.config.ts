import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', 'src/index.ts']
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**']
  }
});