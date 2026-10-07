// app/api/auth/login/route.test.ts
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/auth/login/route'
import {
  createAuthUser,
  currentUser,
  expectJson,
  expectNoDatabaseCalls,
  expectNoDatabaseWrites,
  makeInvalidJsonRequest,
  makeRequest,
  prismaMock,
  resetApiMocks,
  sessionMock,
} from '@/tests/api-test-helpers'

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

let user: Awaited<ReturnType<typeof createAuthUser>>
beforeAll(async () => {
  user = await createAuthUser()
})
beforeEach(resetApiMocks)

describe('POST /api/auth/login', () => {
  it.each([
    {},
    { username: 'ryan' },
    { username: null, password: 'CurrentPassword123' },
    { username: 'ryan', password: 1 },
  ])('rejects missing or invalid credentials: %j', async (body) => {
    await expectJson(await POST(makeRequest('POST', body)), 400, { message: 'Username and password are required.' })
    expectNoDatabaseCalls()
    expect(sessionMock.createSession).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON', async () => {
    await expectJson(await POST(makeInvalidJsonRequest('POST')), 400, {
      message: 'Username and password are required.',
    })
    expectNoDatabaseCalls()
  })

  it.each([true, false])(
    'uses the same error for nonexistent users and wrong passwords (user exists: %s)',
    async (exists) => {
      prismaMock.user.findUnique.mockResolvedValue(exists ? user : null)
      await expectJson(await POST(makeRequest('POST', { username: ' ryan ', password: 'WrongPassword123' })), 401, {
        message: 'Invalid username or password.',
      })
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { username: 'ryan' } })
      expectNoDatabaseWrites()
      expect(sessionMock.createSession).not.toHaveBeenCalled()
    },
  )

  it('verifies the real password, creates a session and excludes the stored hash from the response', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    await expectJson(await POST(makeRequest('POST', { username: ' ryan ', password: 'CurrentPassword123' })), 200, {
      user: currentUser,
    })
    expect(sessionMock.createSession).toHaveBeenCalledExactlyOnceWith(currentUser.id)
    expectNoDatabaseWrites()
  })

  it('does not return success when session creation fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    sessionMock.createSession.mockRejectedValue(new Error('Session unavailable'))
    await expect(POST(makeRequest('POST', { username: 'ryan', password: 'CurrentPassword123' }))).rejects.toThrow(
      'Session unavailable',
    )
  })
})
