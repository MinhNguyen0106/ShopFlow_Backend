import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Chạy trong môi trường Node.js (không phải browser)
    environment: 'node',

    // Glob pattern tìm kiếm test files
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts', 'tests/**/*.test.ts'],

    // Thời gian timeout cho mỗi test case (ms)
    testTimeout: 10_000,

    // Cấu hình coverage
    coverage: {
      provider: 'v8',
      reporter:  ['text', 'json', 'html'],
      reportsDirectory: './coverage',

      // Ngưỡng bao phủ tối thiểu theo testing-standards.md
      thresholds: {
        statements: 80,
        branches:   75,
        functions:  85,
        lines:      80,
      },

      // Chỉ đo coverage cho các file nguồn quan trọng
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/index.ts',                          // Entry point - test bằng integration test
        'src/config/**',                         // Config loaders
        'src/core/entities/**',                  // Type & interface definitions
        'src/infrastructure/database/migrate.ts', // CLI migration runner
      ],
    },

    // Hiển thị output chi tiết
    reporters: ['verbose'],

    // Chạy test song song (pool mỗi file riêng)
    pool: 'forks',
  },
});
