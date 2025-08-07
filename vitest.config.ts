import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Reporters for test results
		reporters: [
			'default',
      ['vitest-sonar-reporter', { outputFile: 'coverage/sonar-report.xml' }],
		],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'lcov', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'],
      // Set minimum threshold for coverage results
      lines: 90,
      functions: 90,
      branches: 90,
      statements: 90
    },
    setupFiles: ['./test/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
