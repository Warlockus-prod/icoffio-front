import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      // Track coverage only on the modules we actually test, not the whole tree.
      include: [
        'lib/utils/**',
        'lib/info/auth-guard.ts',
        'lib/api-rate-limiter.ts',
        'lib/error-logger.ts',
        'lib/data.ts',
        'lib/markdown.ts',
      ],
      exclude: [
        'node_modules/',
        '.next/',
        'coverage/',
        '**/*.d.ts',
        '**/*.config.{js,mjs,ts}',
      ],
      thresholds: {
        // Global thresholds — start realistic, RATCHET UP as tests land.
        // Current actuals (v10.9.0): lines 28%, branches 75%, funcs 69%, statements 28%.
        // The 28% lines floor is dragged down by lib/data.ts (631 lines, 0% covered).
        lines: 25,
        functions: 60,
        branches: 60,
        statements: 25,
        // Security-critical modules MUST stay near 100% — strict per-file gates.
        'lib/utils/html-sanitizer.ts': { lines: 100, functions: 100 },
        'lib/utils/url-guard.ts': { lines: 80, functions: 100, branches: 90 },
        'lib/api-rate-limiter.ts': { lines: 75, functions: 65 },
        'lib/error-logger.ts': { lines: 65, functions: 100 },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
