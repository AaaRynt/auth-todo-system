// app/api/todos/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '@/app/api/todos/route'
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

beforeEach(resetApiMocks)

describe('/api/todos', () => {
  it.each(['GET', 'POST'])('requires a login for %s without accessing the database', async (method) => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    const response = method === 'GET' ? await GET() : await POST(makeRequest('POST', { title: 'Task' }))
    await expectJson(response, 401, { message: 'Unauthorized.' })
    expectNoDatabaseCalls()
  })

  it('lists only the current user’s todos and serializes the response', async () => {
    await expectJson(await GET(), 200, { todos: [serializeTodo(todoRecord)] })
    expect(prismaMock.todo.findMany).toHaveBeenCalledWith({
      where: { userId: currentUser.id },
      orderBy: { createdAt: 'desc' },
      select: expect.any(Object),
    })
    expectNoDatabaseWrites()
  })

  it('returns an empty list when the user has no todos', async () => {
    prismaMock.todo.findMany.mockResolvedValue([])
    await expectJson(await GET(), 200, { todos: [] })
  })

  it.each([
    { body: {}, message: 'Todo title is required.' },
    { body: { title: ' \t ' }, message: 'Todo title is required.' },
    { body: { title: 123 }, message: 'Todo title is required.' },
    { body: { title: 'a'.repeat(201) }, message: 'Todo title must be 200 characters or fewer.' },
    { body: { title: 'Task', priority: 'critical' }, message: 'Invalid todo priority.' },
    { body: { title: 'Task', priority: null }, message: 'Invalid todo priority.' },
    { body: { title: 'Task', groupId: 123 }, message: 'Invalid group id.' },
    { body: { title: 'Task', group: 'a'.repeat(51) }, message: 'Group name must be 50 characters or fewer.' },
  ])('rejects invalid input without writing: $message', async ({ body, message }) => {
    await expectJson(await POST(makeRequest('POST', body)), 400, { message })
    expectNoDatabaseWrites()
  })

  it('rejects invalid JSON without writing', async () => {
    await expectJson(await POST(makeInvalidJsonRequest('POST')), 400, { message: 'Todo title is required.' })
    expectNoDatabaseCalls()
  })

  it('rejects an unavailable or other user’s group without creating a todo', async () => {
    prismaMock.group.findFirst.mockResolvedValue(null)
    await expectJson(await POST(makeRequest('POST', { title: 'Task', groupId: 'group-b' })), 400, {
      message: 'Group not found.',
    })
    expect(prismaMock.group.findFirst).toHaveBeenCalledWith({
      where: { id: 'group-b', userId: currentUser.id },
      select: { id: true },
    })
    expectNoDatabaseWrites()
  })

  it('creates a trimmed todo in Inbox with default priority and ignores a supplied userId', async () => {
    const createdTodo = { ...todoRecord, title: 'Task', priority: 'normal', group: inboxGroup }
    prismaMock.todo.create.mockResolvedValue(createdTodo)
    await expectJson(await POST(makeRequest('POST', { title: ' Task ', userId: 'user-b' })), 201, {
      todo: serializeTodo(createdTodo),
      groups: [inboxGroup, workGroup].map(serializeGroup),
    })
    expect(prismaMock.todo.create).toHaveBeenCalledWith({
      data: { title: 'Task', priority: 'normal', userId: currentUser.id, groupId: inboxGroup.id },
      select: expect.any(Object),
    })
    expect(prismaMock.group.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: currentUser.id, name: { equals: 'Inbox', mode: 'insensitive' } },
      }),
    )
    expect(prismaMock.group.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: currentUser.id } }),
    )
  })

  it('creates a todo in an owned group selected by id', async () => {
    prismaMock.group.findFirst.mockResolvedValueOnce(workGroup)
    prismaMock.todo.create.mockResolvedValue(todoRecord)
    const response = await POST(
      makeRequest('POST', { title: todoRecord.title, priority: 'high', groupId: workGroup.id }),
    )
    expect(response.status).toBe(201)
    expect(prismaMock.group.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: workGroup.id, userId: currentUser.id },
      select: { id: true },
    })
    expect(prismaMock.todo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { title: todoRecord.title, priority: 'high', userId: currentUser.id, groupId: workGroup.id },
      }),
    )
  })

  it('creates a new named group for the current user when needed', async () => {
    prismaMock.group.findFirst.mockResolvedValueOnce(null)
    prismaMock.group.create.mockResolvedValue(workGroup)
    prismaMock.todo.create.mockResolvedValue(todoRecord)
    expect((await POST(makeRequest('POST', { title: todoRecord.title, group: ' Work ' }))).status).toBe(201)
    expect(prismaMock.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: currentUser.id, name: 'Work' },
      }),
    )
  })
})
