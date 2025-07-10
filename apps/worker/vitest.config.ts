import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'src/database/generated/**',
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
