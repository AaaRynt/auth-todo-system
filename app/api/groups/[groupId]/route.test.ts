// app/api/groups/[groupId]/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, PATCH } from '@/app/api/groups/[groupId]/route'
import { serializeGroup } from '@/lib/todo-data'
import {
  currentUser,
  expectJson,
  expectNoDatabaseCalls,
  expectNoDatabaseWrites,
  inboxGroup,
  makeInvalidJsonRequest,
  makeRequest,
  prismaMock,
  resetApiMocks,
  sessionMock,
  transactionMock,
  workGroup,
} from '@/tests/api-test-helpers'

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

const context = () => ({ params: Promise.resolve({ groupId: workGroup.id }) })
beforeEach(() => {
  resetApiMocks()
  prismaMock.group.findFirst.mockResolvedValue(workGroup)
})

describe('/api/groups/[groupId]', () => {
  it.each(['PATCH', 'DELETE'])('requires a login for %s', async (method) => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    const response =
      method === 'PATCH'
        ? await PATCH(makeRequest('PATCH', { name: 'New name' }), context())
        : await DELETE(makeRequest('DELETE'), context())
    await expectJson(response, 401, { message: 'Unauthorized.' })
    expectNoDatabaseCalls()
  })

  it.each([
    { method: 'PATCH', userId: currentUser.id },
    { method: 'DELETE', userId: currentUser.id },
    { method: 'PATCH', userId: 'user-b' },
    { method: 'DELETE', userId: 'user-b' },
  ])('rejects $method when the group is unavailable to $userId', async ({ method, userId }) => {
    sessionMock.getCurrentUser.mockResolvedValue({ ...currentUser, id: userId })
    prismaMock.group.findFirst.mockResolvedValue(null)
    const response =
      method === 'PATCH'
        ? await PATCH(makeRequest('PATCH', { name: 'New name' }), context())
        : await DELETE(makeRequest('DELETE'), context())
    await expectJson(response, 404, { message: 'Group not found.' })
    expect(prismaMock.group.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: workGroup.id, userId },
      }),
    )
    expectNoDatabaseWrites()
  })

  it.each(['Inbox', 'inbox', 'INBOX'])('protects the default group regardless of casing: %s', async (name) => {
    prismaMock.group.findFirst.mockResolvedValue({ ...inboxGroup, name })
    await expectJson(await PATCH(makeRequest('PATCH', { name: 'New name' }), context()), 400, {
      message: 'Inbox cannot be renamed.',
    })
    await expectJson(await DELETE(makeRequest('DELETE'), context()), 400, { message: 'Inbox cannot be deleted.' })
    expectNoDatabaseWrites()
  })

  it.each([{}, { name: '' }, { name: ' \t ' }, { name: 123 }, { name: 'a'.repeat(51) }])(
    'rejects an invalid rename without writing: %j',
    async (body) => {
      expect((await PATCH(makeRequest('PATCH', body), context())).status).toBe(400)
      expectNoDatabaseWrites()
    },
  )

  it('rejects invalid JSON without writing', async () => {
    await expectJson(await PATCH(makeInvalidJsonRequest('PATCH'), context()), 400, {
      message: 'Group name is required.',
    })
    expectNoDatabaseWrites()
  })

  it('rejects a case-insensitive rename conflict scoped to the user and excluding the current group', async () => {
    prismaMock.group.findFirst.mockResolvedValueOnce(workGroup).mockResolvedValueOnce(inboxGroup)
    await expectJson(await PATCH(makeRequest('PATCH', { name: ' inbox ' }), context()), 409, {
      message: 'Group already exists.',
    })
    expect(prismaMock.group.findFirst).toHaveBeenNthCalledWith(2, {
      where: { userId: currentUser.id, id: { not: workGroup.id }, name: { equals: 'Inbox', mode: 'insensitive' } },
      select: { id: true },
    })
    expectNoDatabaseWrites()
  })

  it('renames only the owned group and ignores supplied ownership fields', async () => {
    const renamedGroup = { ...workGroup, name: 'Personal' }
    prismaMock.group.findFirst.mockResolvedValueOnce(workGroup).mockResolvedValueOnce(null)
    prismaMock.group.update.mockResolvedValue(renamedGroup)
    await expectJson(await PATCH(makeRequest('PATCH', { name: ' Personal ', userId: 'user-b' }), context()), 200, {
      group: serializeGroup(renamedGroup),
    })
    expect(prismaMock.group.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: workGroup.id, userId: currentUser.id },
      }),
    )
    expect(prismaMock.group.update).toHaveBeenCalledWith({
      where: { id: workGroup.id },
      data: { name: 'Personal' },
      select: expect.any(Object),
    })
  })

  it.each([true, false])('moves owned todos to the user’s Inbox before deleting (Inbox exists: %s)', async (exists) => {
    transactionMock.group.findFirst.mockResolvedValue(exists ? inboxGroup : null)
    transactionMock.group.create.mockResolvedValue(inboxGroup)
    transactionMock.todo.updateMany.mockResolvedValue({ count: 2 })
    transactionMock.group.findUniqueOrThrow.mockResolvedValue({ ...inboxGroup, _count: { todos: 2 } })
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof transactionMock) => Promise<unknown>) => {
      return callback(transactionMock)
    })

    const response = await DELETE(makeRequest('DELETE'), context())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      destinationGroup: { id: inboxGroup.id, name: 'Inbox', todoCount: 2 },
    })
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
    expect(transactionMock.group.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: currentUser.id, name: { equals: 'Inbox', mode: 'insensitive' } },
      }),
    )
    if (exists) {
      expect(transactionMock.group.create).not.toHaveBeenCalled()
    } else {
      expect(transactionMock.group.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: currentUser.id, name: 'Inbox' },
        }),
      )
    }
    expect(transactionMock.todo.updateMany).toHaveBeenCalledWith({
      where: { groupId: workGroup.id, userId: currentUser.id },
      data: { groupId: inboxGroup.id },
    })
    expect(transactionMock.group.delete).toHaveBeenCalledWith({ where: { id: workGroup.id } })
    expect(transactionMock.todo.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
      transactionMock.group.delete.mock.invocationCallOrder[0],
    )
    expect(prismaMock.group.delete).not.toHaveBeenCalled()
  })

  it('does not delete the group if moving its todos fails', async () => {
    transactionMock.group.findFirst.mockResolvedValue(inboxGroup)
    transactionMock.todo.updateMany.mockRejectedValue(new Error('Move failed'))
    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof transactionMock) => Promise<unknown>) => {
      return callback(transactionMock)
    })
    await expect(DELETE(makeRequest('DELETE'), context())).rejects.toThrow('Move failed')
    expect(transactionMock.group.delete).not.toHaveBeenCalled()
    expect(transactionMock.group.findUniqueOrThrow).not.toHaveBeenCalled()
    expect(prismaMock.group.delete).not.toHaveBeenCalled()
  })
})
