// app/api/auth/me/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from '@/app/api/auth/me/route'
import { currentUser, expectJson, expectNoDatabaseCalls, resetApiMocks, sessionMock } from '@/tests/api-test-helpers'

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

beforeEach(resetApiMocks)

describe('GET /api/auth/me', () => {
  it('returns 401 with a null user when unauthenticated', async () => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    await expectJson(await GET(), 401, { user: null })
    expectNoDatabaseCalls()
  })

  it('returns the authenticated user supplied by the session layer', async () => {
    await expectJson(await GET(), 200, { user: currentUser })
    expect(sessionMock.getCurrentUser).toHaveBeenCalledOnce()
    expectNoDatabaseCalls()
  })
})
