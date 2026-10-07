// tests/frontend/setup.ts
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'

// Node/API tests keep their original environment. DOM cleanup applies only to jsdom files.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react')
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    // jsdom does not measure layout; Radix observes checkbox/popover sizes on mount.
    vi.stubGlobal(
      'ResizeObserver',
      class TestResizeObserver {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      },
    )
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('Unexpected fetch: mock this request in the test.')
      }),
    )
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
}
