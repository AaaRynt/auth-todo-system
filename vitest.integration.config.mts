// vitest.integration.config.mts
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('.', import.meta.url)) },
  },
  test: {
    environment: 'node',
    clearMocks: true,
    restoreMocks: true,
    include: ['tests/integration/**/*.test.ts'],
    exclude: configDefaults.exclude,
    setupFiles: ['tests/integration/setup.ts'],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 10000,
  },
})
