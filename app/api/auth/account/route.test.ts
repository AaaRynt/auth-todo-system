// app/api/auth/account/route.test.ts
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, PATCH } from '@/app/api/auth/account/route'
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
  transactionMock,
} from '@/tests/api-test-helpers'

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

let user: Awaited<ReturnType<typeof createAuthUser>>
beforeAll(async () => {
  user = await createAuthUser()
})
beforeEach(resetApiMocks)

describe('/api/auth/account', () => {
  it.each(['PATCH', 'DELETE'])('requires a login for %s', async (method) => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    const response =
      method === 'PATCH' ? await PATCH(makeRequest('PATCH', {})) : await DELETE(makeRequest('DELETE', {}))
    await expectJson(response, 401, { message: 'Unauthorized.' })
    expectNoDatabaseCalls()
    expect(sessionMock.deleteCurrentSession).not.toHaveBeenCalled()
  })

  it.each([
    { body: {}, message: 'Nothing to update.' },
    { body: { nickname: 123 }, message: 'Nothing to update.' },
    { body: { nickname: null }, message: 'Nothing to update.' },
    { body: { nickname: ' \t ' }, message: 'Nickname is required.' },
    { body: { nickname: 'a'.repeat(25) }, message: 'Nickname must be 24 characters or fewer.' },
  ])('rejects an invalid profile update without writing: $message', async ({ body, message }) => {
    await expectJson(await PATCH(makeRequest('PATCH', body)), 400, { message })
    expectNoDatabaseCalls()
  })

  it('rejects invalid JSON in a profile update', async () => {
    await expectJson(await PATCH(makeInvalidJsonRequest('PATCH')), 400, { message: 'Nothing to update.' })
    expectNoDatabaseCalls()
  })

  it('updates only the current user’s nickname and returns public fields', async () => {
    prismaMock.user.update.mockResolvedValue({ ...currentUser, nickname: 'New Name', createdAt: user.createdAt })
    await expectJson(
      await PATCH(
        makeRequest('PATCH', {
          nickname: ' New Name ',
          userId: 'user-b',
          username: 'Injected',
          passwordHash: 'Injected',
        }),
      ),
      200,
      { user: { ...currentUser, nickname: 'New Name' } },
    )
    expect(prismaMock.user.update).toHaveBeenCalledExactlyOnceWith({
      where: { id: currentUser.id },
      data: { nickname: 'New Name' },
      select: { id: true, username: true, nickname: true, createdAt: true },
    })
    expect(sessionMock.deleteCurrentSession).not.toHaveBeenCalled()
  })

  it.each([{}, { password: '' }, { password: 123 }, { password: null }])(
    'requires a password before deleting the account: %j',
    async (body) => {
      await expectJson(await DELETE(makeRequest('DELETE', body)), 400, { message: 'Password is required.' })
      expectNoDatabaseCalls()
      expect(sessionMock.deleteCurrentSession).not.toHaveBeenCalled()
    },
  )

  it('rejects invalid JSON when deleting the account', async () => {
    await expectJson(await DELETE(makeInvalidJsonRequest('DELETE')), 400, { message: 'Password is required.' })
    expectNoDatabaseCalls()
    expect(sessionMock.deleteCurrentSession).not.toHaveBeenCalled()
  })

  it.each([true, false])('rejects a wrong password or missing account (user exists: %s)', async (exists) => {
    prismaMock.user.findUnique.mockResolvedValue(exists ? user : null)
    await expectJson(await DELETE(makeRequest('DELETE', { password: 'WrongPassword123' })), 401, {
      message: 'Password is incorrect.',
    })
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: currentUser.id },
      select: { id: true, passwordHash: true },
    })
    expectNoDatabaseWrites()
    expect(sessionMock.deleteCurrentSession).not.toHaveBeenCalled()
  })

  it('deletes only the current user after password verification, then clears the session', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    transactionMock.user.delete.mockResolvedValue(user)
    await expectJson(await DELETE(makeRequest('DELETE', { password: 'CurrentPassword123', userId: 'user-b' })), 200, {
      ok: true,
    })
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { id: currentUser.id },
      select: { id: true, passwordHash: true },
    })
    expect(transactionMock.user.delete).toHaveBeenCalledExactlyOnceWith({ where: { id: currentUser.id } })
    expect(prismaMock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' })
    expect(sessionMock.deleteCurrentSession).toHaveBeenCalledOnce()
    expect(transactionMock.user.delete.mock.invocationCallOrder[0]).toBeLessThan(
      sessionMock.deleteCurrentSession.mock.invocationCallOrder[0],
    )
  })

  it('does not clear the session when deleting the account fails', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    transactionMock.user.delete.mockRejectedValue(new Error('Delete failed'))
    await expect(DELETE(makeRequest('DELETE', { password: 'CurrentPassword123' }))).rejects.toThrow('Delete failed')
    expect(sessionMock.deleteCurrentSession).not.toHaveBeenCalled()
  })

  it('deletes solo owned workspaces before deleting the account', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    transactionMock.workspace.findMany.mockResolvedValue([{ id: 'solo', _count: { members: 1 } }])
    await expectJson(await DELETE(makeRequest('DELETE', { password: 'CurrentPassword123' })), 200, { ok: true })
    expect(transactionMock.workspace.findMany).toHaveBeenCalledWith({
      where: { members: { some: { userId: currentUser.id, role: 'OWNER' } } },
      select: { id: true, _count: { select: { members: true } } },
    })
    expect(transactionMock.workspace.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['solo'] } } })
    expect(transactionMock.workspace.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      transactionMock.user.delete.mock.invocationCallOrder[0],
    )
  })

  it('rejects deletion for a shared workspace owner without deleting any workspace or clearing the session', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    transactionMock.workspace.findMany.mockResolvedValue([
      { id: 'solo', _count: { members: 1 } },
      { id: 'shared', _count: { members: 2 } },
    ])
    await expectJson(await DELETE(makeRequest('DELETE', { password: 'CurrentPassword123' })), 409, {
      message: 'Transfer ownership of shared workspaces before deleting your account.',
    })
    expect(transactionMock.workspace.deleteMany).not.toHaveBeenCalled()
    expect(transactionMock.user.delete).not.toHaveBeenCalled()
    expect(sessionMock.deleteCurrentSession).not.toHaveBeenCalled()
  })

  it('returns a retryable conflict when the serializable deletion transaction conflicts', async () => {
    prismaMock.user.findUnique.mockResolvedValue(user)
    prismaMock.$transaction.mockRejectedValue({ code: 'P2034' })
    await expectJson(await DELETE(makeRequest('DELETE', { password: 'CurrentPassword123' })), 409, {
      message: 'Workspace membership changed. Reload and try again.',
    })
    expect(sessionMock.deleteCurrentSession).not.toHaveBeenCalled()
  })
})
