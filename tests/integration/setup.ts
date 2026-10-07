// tests/integration/setup.ts
import { vi } from 'vitest'
import { assertTestDatabaseUrl } from '@/tests/test-database-url.mjs'

// Set the guarded test URL before any route or Prisma singleton is imported.
process.env.DATABASE_URL = assertTestDatabaseUrl(process.env.TEST_DATABASE_URL)

vi.mock('next/headers', async () => ({
  cookies: async () => (await import('@/tests/integration/cookie-store')).cookieStore,
}))
