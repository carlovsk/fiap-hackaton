import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      exclude: [
        'src/database/generated/**',
        'src/test-setup.ts',
        '.eslintrc.cjs',
        '.prettierrc.cjs',
        'eslint.config.cjs',
        'vitest.config.ts',
        'tsconfig.json',
        'package.json',
        'Dockerfile',
        '.env*',
        'coverage/**',
        'node_modules/**',
      ],
    },
  },
});
