// app/api/auth/register/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST } from '@/app/api/auth/register/route'
import { verifyPassword } from '@/lib/auth/password'
import {
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

beforeEach(resetApiMocks)

describe('POST /api/auth/register', () => {
  it.each([
    {},
    { username: 'ryan' },
    { password: 'Password123' },
    { username: '  ', password: 'Password123' },
    { username: 123, password: 'Password123' },
    { username: 'ryan', password: 123 },
  ])('rejects missing or invalid credentials: %j', async (body) => {
    await expectJson(await POST(makeRequest('POST', body)), 400, { message: 'Username and password are required.' })
    expectNoDatabaseCalls()
    expect(sessionMock.createSession).not.toHaveBeenCalled()
  })

  it('rejects invalid JSON without accessing the database', async () => {
    await expectJson(await POST(makeInvalidJsonRequest('POST')), 400, {
      message: 'Username and password are required.',
    })
    expectNoDatabaseCalls()
  })

  it.each(['Aa123', 'lowercase123', 'UPPERCASE123', 'NoNumbers'])(
    'enforces the password policy: %s',
    async (password) => {
      expect((await POST(makeRequest('POST', { username: 'ryan', password }))).status).toBe(400)
      expectNoDatabaseCalls()
      expect(sessionMock.createSession).not.toHaveBeenCalled()
    },
  )

  it('rejects an existing trimmed username without creating a user or session', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: currentUser.id })
    await expectJson(await POST(makeRequest('POST', { username: ' ryan ', password: 'Password123' })), 409, {
      message: 'Username already exists.',
    })
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { username: 'ryan' }, select: { id: true } })
    expectNoDatabaseWrites()
    expect(sessionMock.createSession).not.toHaveBeenCalled()
  })

  it('stores a real password hash, initializes the nickname and creates a session after user creation', async () => {
    const profile = { ...currentUser, nickname: 'ryan', createdAt: new Date(currentUser.createdAt) }
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockResolvedValue(profile)
    await expectJson(
      await POST(
        makeRequest('POST', {
          username: ' ryan ',
          password: ' Password123 ',
          userId: 'user-b',
          nickname: 'Injected',
        }),
      ),
      200,
      { user: { ...currentUser, nickname: 'ryan' } },
    )
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        username: 'ryan',
        nickname: 'ryan',
        passwordHash: expect.any(String),
        workspaceMembers: { create: { role: 'OWNER', isDefault: true, workspace: { create: { name: 'Personal' } } } },
      },
      select: { id: true, username: true, nickname: true, createdAt: true },
    })
    const passwordHash = prismaMock.user.create.mock.calls[0][0].data.passwordHash
    expect(passwordHash).not.toBe(' Password123 ')
    await expect(verifyPassword(' Password123 ', passwordHash)).resolves.toBe(true)
    expect(sessionMock.createSession).toHaveBeenCalledExactlyOnceWith(currentUser.id)
    expect(prismaMock.user.create.mock.invocationCallOrder[0]).toBeLessThan(
      sessionMock.createSession.mock.invocationCallOrder[0],
    )
  })

  it('does not create a session if user creation fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null)
    prismaMock.user.create.mockRejectedValue(new Error('Database unavailable'))
    await expect(POST(makeRequest('POST', { username: 'ryan', password: 'Password123' }))).rejects.toThrow(
      'Database unavailable',
    )
    expect(sessionMock.createSession).not.toHaveBeenCalled()
  })
})
