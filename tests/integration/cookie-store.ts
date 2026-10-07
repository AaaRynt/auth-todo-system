// tests/integration/cookie-store.ts
import { vi } from 'vitest'

const values = new Map<string, string>()
export const cookieStore = {
  get: vi.fn((name: string) => {
    const value = values.get(name)
    return value === undefined ? undefined : { value }
  }),
  set: vi.fn((name: string, value: string, options?: { maxAge?: number }) => {
    if (options?.maxAge === 0) values.delete(name)
    else values.set(name, value)
  }),
}

export function clearCookies() {
  values.clear()
}
