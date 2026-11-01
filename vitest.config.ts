import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'frontend/tests/unit/**/*.test.ts'],
  },
});
