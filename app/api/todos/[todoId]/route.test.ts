// app/api/todos/[todoId]/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DELETE, PATCH } from '@/app/api/todos/[todoId]/route'
import { serializeGroup, serializeTodo } from '@/lib/todo-data'
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
  todoRecord,
  workGroup,
} from '@/tests/api-test-helpers'

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

const context = () => ({ params: Promise.resolve({ todoId: todoRecord.id }) })
beforeEach(resetApiMocks)

describe('/api/todos/[todoId]', () => {
  it.each(['PATCH', 'DELETE'])('requires a login for %s', async (method) => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    const response =
      method === 'PATCH'
        ? await PATCH(makeRequest('PATCH', { title: 'Task' }), context())
        : await DELETE(makeRequest('DELETE'), context())
    await expectJson(response, 401, { message: 'Unauthorized.' })
    expectNoDatabaseCalls()
  })

  it.each([currentUser.id, 'user-b'])('rejects PATCH when the todo is unavailable to %s', async (userId) => {
    sessionMock.getCurrentUser.mockResolvedValue({ ...currentUser, id: userId })
    prismaMock.todo.findFirst.mockResolvedValue(null)
    await expectJson(await PATCH(makeRequest('PATCH', { title: 'Task' }), context()), 404, {
      message: 'Todo not found.',
    })
    expect(prismaMock.todo.findFirst).toHaveBeenCalledWith({
      where: { id: todoRecord.id, userId },
      select: { id: true },
    })
    expectNoDatabaseWrites()
  })

  it.each([
    { body: {}, message: 'Nothing to update.' },
    { body: null, message: 'Nothing to update.' },
    { body: { userId: 'user-b' }, message: 'Nothing to update.' },
    { body: { title: '  ' }, message: 'Todo title is required.' },
    { body: { title: 1 }, message: 'Todo title is required.' },
    { body: { title: 'a'.repeat(201) }, message: 'Todo title must be 200 characters or fewer.' },
    { body: { completed: 'true' }, message: 'Invalid completed value.' },
    { body: { completed: 1 }, message: 'Invalid completed value.' },
    { body: { completed: null }, message: 'Invalid completed value.' },
    { body: { priority: 'medium' }, message: 'Invalid todo priority.' },
    { body: { groupId: null }, message: 'Invalid group id.' },
    { body: { group: 'a'.repeat(51) }, message: 'Group name must be 50 characters or fewer.' },
    { body: { title: 'Valid title', completed: 'false' }, message: 'Invalid completed value.' },
  ])('rejects invalid updates without partial writes: $message', async ({ body, message }) => {
    await expectJson(await PATCH(makeRequest('PATCH', body), context()), 400, { message })
    expectNoDatabaseWrites()
  })

  it('rejects invalid JSON without updating', async () => {
    await expectJson(await PATCH(makeInvalidJsonRequest('PATCH'), context()), 400, { message: 'Nothing to update.' })
    expectNoDatabaseWrites()
  })

  it('rejects moving a todo to another user’s group', async () => {
    prismaMock.group.findFirst.mockResolvedValue(null)
    await expectJson(await PATCH(makeRequest('PATCH', { groupId: 'group-b' }), context()), 400, {
      message: 'Group not found.',
    })
    expect(prismaMock.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-b', userId: currentUser.id },
      select: { id: true },
    })
    expectNoDatabaseWrites()
  })

  it.each([true, false])('sets completed to %s without overwriting unrelated fields', async (completed) => {
    const updatedTodo = { ...todoRecord, completed }
    prismaMock.todo.update.mockResolvedValue(updatedTodo)
    await expectJson(await PATCH(makeRequest('PATCH', { completed }), context()), 200, {
      todo: serializeTodo(updatedTodo),
      groups: [inboxGroup, workGroup].map(serializeGroup),
    })
    expect(prismaMock.todo.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: todoRecord.id, userId: currentUser.id },
      }),
    )
    expect(prismaMock.todo.update).toHaveBeenCalledWith({
      where: { id: todoRecord.id },
      data: { completed },
      select: expect.any(Object),
    })
  })

  it('updates title, priority and owned group while ignoring ownership changes in the body', async () => {
    prismaMock.group.findFirst.mockResolvedValueOnce(inboxGroup)
    const updatedTodo = { ...todoRecord, title: 'Updated task', priority: 'urgent', group: inboxGroup }
    prismaMock.todo.update.mockResolvedValue(updatedTodo)
    await expectJson(
      await PATCH(
        makeRequest('PATCH', {
          title: ' Updated task ',
          priority: 'urgent',
          groupId: inboxGroup.id,
          userId: 'user-b',
          id: 'todo-b',
        }),
        context(),
      ),
      200,
      { todo: serializeTodo(updatedTodo), groups: [inboxGroup, workGroup].map(serializeGroup) },
    )
    expect(prismaMock.group.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: inboxGroup.id, userId: currentUser.id },
      select: { id: true },
    })
    expect(prismaMock.todo.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: todoRecord.id },
        data: { title: 'Updated task', priority: 'urgent', groupId: inboxGroup.id },
      }),
    )
  })

  it.each([currentUser.id, 'user-b'])('returns 404 when DELETE matches no todo owned by %s', async (userId) => {
    sessionMock.getCurrentUser.mockResolvedValue({ ...currentUser, id: userId })
    prismaMock.todo.deleteMany.mockResolvedValue({ count: 0 })
    await expectJson(await DELETE(makeRequest('DELETE'), context()), 404, { message: 'Todo not found.' })
    expect(prismaMock.todo.deleteMany).toHaveBeenCalledWith({ where: { id: todoRecord.id, userId } })
    expect(prismaMock.group.findMany).not.toHaveBeenCalled()
  })

  it('deletes the owned todo and returns refreshed group counts', async () => {
    prismaMock.todo.deleteMany.mockResolvedValue({ count: 1 })
    await expectJson(await DELETE(makeRequest('DELETE'), context()), 200, {
      ok: true,
      groups: [inboxGroup, workGroup].map(serializeGroup),
    })
    expect(prismaMock.todo.deleteMany).toHaveBeenCalledWith({ where: { id: todoRecord.id, userId: currentUser.id } })
    expect(prismaMock.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: currentUser.id } }),
    )
  })
})
