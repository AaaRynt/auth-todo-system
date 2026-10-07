// lib/auth/session.test.ts
import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createSession, deleteCurrentSession, getCurrentUser } from '@/lib/auth/session'

const { cookieStore, cookiesMock, prismaMock } = vi.hoisted(() => ({
  cookieStore: { get: vi.fn(), set: vi.fn() },
  cookiesMock: vi.fn(),
  prismaMock: { session: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() } },
}))

vi.mock('next/headers', () => ({ cookies: cookiesMock }))
vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }))

const cookieName = 'auth-todo-session'
const now = new Date('2026-10-07T00:00:00.000Z')
const token = 'browser-session-token'
// Known SHA-256/base64url fixture, independent of the session module's private helper.
const tokenHash = 'QyuITiEKUCOcIwMwqzFvpdoAPCM0qzIO5bYVgaBCzr0'
const userRecord = {
  id: 'user-a',
  username: 'ryan',
  nickname: 'Ryan',
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  passwordHash: 'private-password-hash',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('NODE_ENV', 'test')
  cookiesMock.mockResolvedValue(cookieStore)
  prismaMock.session.create.mockResolvedValue({})
  prismaMock.session.findUnique.mockResolvedValue(null)
  prismaMock.session.delete.mockResolvedValue({})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

function expectClearedCookie(secure = false) {
  expect(cookieStore.set).toHaveBeenCalledExactlyOnceWith(cookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 0,
  })
}

describe('createSession', () => {
  it.each([
    { environment: 'development', secure: false },
    { environment: 'test', secure: false },
    { environment: 'production', secure: true },
  ])('stores only a token hash and sets a 30-day cookie in $environment', async ({ environment, secure }) => {
    vi.stubEnv('NODE_ENV', environment)
    await createSession(userRecord.id)

    expect(cookieStore.set).toHaveBeenCalledOnce()
    const rawToken: string = cookieStore.set.mock.calls[0][1]
    expect(rawToken).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(Buffer.from(rawToken, 'base64url')).toHaveLength(32)
    const expectedHash = createHash('sha256').update(rawToken).digest('base64url')
    expect(expectedHash).not.toBe(rawToken)
    expect(prismaMock.session.create).toHaveBeenCalledExactlyOnceWith({
      data: { userId: userRecord.id, tokenHash: expectedHash, expiresAt: new Date('2026-11-06T00:00:00.000Z') },
    })
    expect(JSON.stringify(prismaMock.session.create.mock.calls)).not.toContain(rawToken)
    expect(cookieStore.set).toHaveBeenCalledWith(cookieName, rawToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      expires: new Date('2026-11-06T00:00:00.000Z'),
    })
    expect(prismaMock.session.create.mock.invocationCallOrder[0]).toBeLessThan(
      cookieStore.set.mock.invocationCallOrder[0],
    )
  })

  it('generates different tokens and hashes for separate sessions', async () => {
    await createSession(userRecord.id)
    await createSession(userRecord.id)

    expect(cookieStore.set.mock.calls[0][1]).not.toBe(cookieStore.set.mock.calls[1][1])
    const firstSession = prismaMock.session.create.mock.calls[0][0].data
    const secondSession = prismaMock.session.create.mock.calls[1][0].data
    expect(firstSession.tokenHash).not.toBe(secondSession.tokenHash)
    expect(firstSession.userId).toBe(userRecord.id)
    expect(secondSession.userId).toBe(userRecord.id)
  })

  it('does not issue a cookie when persisting the session fails', async () => {
    prismaMock.session.create.mockRejectedValue(new Error('Session persistence failed'))
    await expect(createSession(userRecord.id)).rejects.toThrow('Session persistence failed')
    expect(cookiesMock).not.toHaveBeenCalled()
    expect(cookieStore.set).not.toHaveBeenCalled()
  })
})

describe('getCurrentUser', () => {
  it.each([undefined, { value: '' }])(
    'returns null without querying the database for a missing or empty cookie: %j',
    async (cookie) => {
      cookieStore.get.mockReturnValue(cookie)
      await expect(getCurrentUser()).resolves.toBeNull()
      expect(cookieStore.get).toHaveBeenCalledExactlyOnceWith(cookieName)
      expect(prismaMock.session.findUnique).not.toHaveBeenCalled()
      expect(prismaMock.session.delete).not.toHaveBeenCalled()
      expect(cookieStore.set).not.toHaveBeenCalled()
    },
  )

  it('returns null when the cookie token has no matching session', async () => {
    cookieStore.get.mockReturnValue({ value: token })
    await expect(getCurrentUser()).resolves.toBeNull()
    expect(prismaMock.session.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tokenHash } }))
    expect(prismaMock.session.delete).not.toHaveBeenCalled()
  })

  it.each(['2026-10-07T00:00:00.001Z', '2026-11-06T00:00:00.000Z'])(
    'returns only public user fields for a session expiring in the future: %s',
    async (expiresAt) => {
      cookieStore.get.mockReturnValue({ value: token })
      prismaMock.session.findUnique.mockResolvedValue({ expiresAt: new Date(expiresAt), user: userRecord })
      await expect(getCurrentUser()).resolves.toEqual({
        id: userRecord.id,
        username: userRecord.username,
        nickname: userRecord.nickname,
        createdAt: '2026-01-01T00:00:00.000Z',
      })
      expect(prismaMock.session.findUnique).toHaveBeenCalledExactlyOnceWith({
        where: { tokenHash },
        include: { user: { select: { id: true, username: true, nickname: true, createdAt: true } } },
      })
      expect(prismaMock.session.delete).not.toHaveBeenCalled()
      expect(cookieStore.set).not.toHaveBeenCalled()
    },
  )

  it.each(['2026-10-06T23:59:59.999Z', '2026-10-07T00:00:00.000Z'])(
    'rejects and cleans a session that has expired or expires exactly now: %s',
    async (expiresAt) => {
      cookieStore.get.mockReturnValue({ value: token })
      prismaMock.session.findUnique.mockResolvedValue({ expiresAt: new Date(expiresAt), user: userRecord })
      await expect(getCurrentUser()).resolves.toBeNull()
      expect(prismaMock.session.delete).toHaveBeenCalledExactlyOnceWith({ where: { tokenHash } })
      expectClearedCookie()
    },
  )

  it('still rejects and clears an expired session if its database row has already been removed', async () => {
    cookieStore.get.mockReturnValue({ value: token })
    prismaMock.session.findUnique.mockResolvedValue({ expiresAt: now, user: userRecord })
    prismaMock.session.delete.mockRejectedValue(Object.assign(new Error('Session not found'), { code: 'P2025' }))
    await expect(getCurrentUser()).resolves.toBeNull()
    expectClearedCookie()
  })

  it('does not return a user when the session lookup fails', async () => {
    cookieStore.get.mockReturnValue({ value: token })
    prismaMock.session.findUnique.mockRejectedValue(new Error('Session lookup failed'))
    await expect(getCurrentUser()).rejects.toThrow('Session lookup failed')
    expect(prismaMock.session.delete).not.toHaveBeenCalled()
  })

  it('propagates failure to clear an expired cookie instead of returning a user', async () => {
    cookieStore.get.mockReturnValue({ value: token })
    prismaMock.session.findUnique.mockResolvedValue({ expiresAt: now, user: userRecord })
    cookieStore.set.mockImplementation(() => {
      throw new Error('Cookie write failed')
    })
    await expect(getCurrentUser()).rejects.toThrow('Cookie write failed')
  })
})

describe('deleteCurrentSession', () => {
  it.each([
    { environment: 'development', secure: false },
    { environment: 'test', secure: false },
    { environment: 'production', secure: true },
  ])(
    'deletes only the cookie token’s hashed session and clears the cookie in $environment',
    async ({ environment, secure }) => {
      vi.stubEnv('NODE_ENV', environment)
      cookieStore.get.mockReturnValue({ value: token })
      await deleteCurrentSession()
      expect(cookieStore.get).toHaveBeenCalledExactlyOnceWith(cookieName)
      expect(prismaMock.session.delete).toHaveBeenCalledExactlyOnceWith({ where: { tokenHash } })
      expectClearedCookie(secure)
    },
  )

  it.each([undefined, { value: '' }])(
    'clears the cookie without a database delete for a missing or empty token: %j',
    async (cookie) => {
      cookieStore.get.mockReturnValue(cookie)
      await deleteCurrentSession()
      expect(prismaMock.session.delete).not.toHaveBeenCalled()
      expectClearedCookie()
    },
  )

  it('still clears the cookie when the session row has already been deleted', async () => {
    cookieStore.get.mockReturnValue({ value: token })
    prismaMock.session.delete.mockRejectedValue(Object.assign(new Error('Session not found'), { code: 'P2025' }))
    await expect(deleteCurrentSession()).resolves.toBeUndefined()
    expectClearedCookie()
  })

  it('allows repeated logout after the browser cookie has been cleared', async () => {
    cookieStore.get.mockReturnValueOnce({ value: token }).mockReturnValueOnce(undefined)
    await deleteCurrentSession()
    await deleteCurrentSession()
    expect(prismaMock.session.delete).toHaveBeenCalledExactlyOnceWith({ where: { tokenHash } })
    expect(cookieStore.set).toHaveBeenCalledTimes(2)
    for (const call of cookieStore.set.mock.calls) {
      expect(call).toEqual([cookieName, '', { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: 0 }])
    }
  })

  it('propagates a cookie write failure instead of reporting successful cleanup', async () => {
    cookieStore.get.mockReturnValue({ value: token })
    cookieStore.set.mockImplementation(() => {
      throw new Error('Cookie write failed')
    })
    await expect(deleteCurrentSession()).rejects.toThrow('Cookie write failed')
  })
})
