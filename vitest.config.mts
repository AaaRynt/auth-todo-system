// vitest.config.mts
import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['tests/frontend/setup.ts'],
    exclude: [...configDefaults.exclude, 'tests/integration/**'],
    clearMocks: true,
    restoreMocks: true,
  },
})
