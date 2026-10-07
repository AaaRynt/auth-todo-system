// app/api/auth/logout/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/auth/logout/route'
import { expectJson, expectNoDatabaseCalls, resetApiMocks, sessionMock } from '@/tests/api-test-helpers'

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

beforeEach(resetApiMocks)

describe('POST /api/auth/logout', () => {
  it('delegates cleanup to the session layer and returns success', async () => {
    await expectJson(await POST(), 200, { ok: true })
    expect(sessionMock.deleteCurrentSession).toHaveBeenCalledOnce()
    expect(sessionMock.getCurrentUser).not.toHaveBeenCalled()
    expectNoDatabaseCalls()
  })

  it('does not report success when session cleanup fails', async () => {
    sessionMock.deleteCurrentSession.mockRejectedValue(new Error('Session cleanup failed'))
    await expect(POST()).rejects.toThrow('Session cleanup failed')
    expectNoDatabaseCalls()
  })
})
