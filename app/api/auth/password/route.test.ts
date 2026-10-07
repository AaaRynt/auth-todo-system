// app/api/auth/password/route.test.ts
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { PATCH } from '@/app/api/auth/password/route'
import { verifyPassword } from '@/lib/auth/password'
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

describe('PATCH /api/auth/password', () => {
  it('requires a login without accessing the database', async () => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    await expectJson(await PATCH(makeRequest('PATCH', {})), 401, { message: 'Unauthorized.' })
    expectNoDatabaseCalls()
  })

  it.each([{}, { currentPassword: 'CurrentPassword123' }, { currentPassword: 123, newPassword: 'NewPassword123' }])(
    'rejects missing or invalid password fields: %j',
    async (body) => {
      await expectJson(await PATCH(makeRequest('PATCH', body)), 400, {
        message: 'Current password and new password are required.',
      })
      expectNoDatabaseCalls()
    },
  )

  it('rejects invalid JSON without writing', async () => {
    expect((await PATCH(makeInvalidJsonRequest('PATCH'))).status).toBe(400)
    expectNoDatabaseCalls()
  })

  it.each(['Aa123', 'lowercase123', 'UPPERCASE123', 'NoNumbers'])(
    'rejects a weak new password: %s',
    async (newPassword) => {
      expect((await PATCH(makeRequest('PATCH', { currentPassword: 'CurrentPassword123', newPassword }))).status).toBe(
        400,
      )
      expectNoDatabaseCalls()
    },
  )

  it('rejects reuse of the current password', async () => {
    await expectJson(
      await PATCH(
        makeRequest('PATCH', {
          currentPassword: 'CurrentPassword123',
          newPassword: 'CurrentPassword123',
        }),
      ),
      400,
      { message: 'New password must be different from current password.' },
    )
    expectNoDatabaseCalls()
  })

  it.each([true, false])('rejects an incorrect password or missing account (user exists: %s)', async (exists) => {
    prismaMock.user.findUnique.mockResolvedValue(exists ? user : null)
    await expectJson(
      await PATCH(
        makeRequest('PATCH', {
          currentPassword: 'WrongPassword123',
          newPassword: 'NewPassword123',
        }),
      ),
      401,
      { message: 'Current password is incorrect.' },
    )
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: currentUser.id },
      select: { id: true, passwordHash: true },
    })
    expectNoDatabaseWrites()
  })

  it('updates only the current user’s password hash after verification', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    await expectJson(
      await PATCH(
        makeRequest('PATCH', {
          currentPassword: 'CurrentPassword123',
          newPassword: 'NewPassword123',
          userId: 'user-b',
        }),
      ),
      200,
      { ok: true },
    )
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: currentUser.id },
      select: { id: true, passwordHash: true },
    })
    expect(prismaMock.user.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: currentUser.id },
      data: { passwordHash: expect.any(String) },
    })
    const passwordHash = prismaMock.user.update.mock.calls[0][0].data.passwordHash
    expect(passwordHash).not.toBe(user.passwordHash)
    await expect(verifyPassword('NewPassword123', passwordHash)).resolves.toBe(true)
    await expect(verifyPassword('CurrentPassword123', passwordHash)).resolves.toBe(false)
  })
})
