// tests/integration/ownership.test.ts
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DELETE as deleteGroup, PATCH as patchGroup } from '@/app/api/groups/[groupId]/route'
import { GET as getGroups } from '@/app/api/groups/route'
import { DELETE as deleteTodo, PATCH as patchTodo } from '@/app/api/todos/[todoId]/route'
import { POST as createTodo, GET as getTodos } from '@/app/api/todos/route'
import { prisma } from '@/lib/prisma'
import { createFixture, deleteFixture, loginAs, makeRequest } from '@/tests/integration/fixtures'
import type { TIntegrationFixture } from '@/tests/integration/fixtures'
import type { TGroup, TTodo } from '@/types/todo'

let fixture: TIntegrationFixture
beforeEach(async () => {
  fixture = await createFixture()
})
afterEach(async () => {
  await deleteFixture(fixture)
})
afterAll(async () => {
  await prisma.$disconnect()
})

describe('real database ownership', () => {
  it.each(['A', 'B'])('only lists user %s’s todos', async (actor) => {
    const user = actor === 'A' ? fixture.userA : fixture.userB
    await loginAs(user.id)
    const response = await getTodos()
    expect(response.status).toBe(200)
    const body = (await response.json()) as { todos: TTodo[] }
    const expectedIds = actor === 'A' ? [fixture.todoA.id, fixture.completedA.id] : [fixture.todoB.id]
    expect(body.todos.map((todo) => todo.id).sort()).toEqual(expectedIds.sort())
  })

  it.each(['A', 'B'])('only lists user %s’s groups and correct counts', async (actor) => {
    await loginAs(actor === 'A' ? fixture.userA.id : fixture.userB.id)
    const response = await getGroups()
    expect(response.status).toBe(200)
    const body = (await response.json()) as { groups: TGroup[] }
    expect(body.groups).toEqual(
      expect.arrayContaining([
        { id: actor === 'A' ? fixture.inboxA.id : fixture.inboxB.id, name: 'Inbox', todoCount: 0 },
        { id: actor === 'A' ? fixture.groupA.id : fixture.groupB.id, name: 'Work', todoCount: actor === 'A' ? 2 : 1 },
      ]),
    )
    expect(body.groups).toHaveLength(2)
  })

  it.each(['PATCH', 'DELETE'])('prevents user B from using %s on user A’s todo and preserves it', async (method) => {
    await loginAs(fixture.userB.id)
    const context = { params: Promise.resolve({ todoId: fixture.todoA.id }) }
    const response =
      method === 'PATCH'
        ? await patchTodo(makeRequest('PATCH', { title: 'Hijacked', completed: true }), context)
        : await deleteTodo(makeRequest('DELETE'), context)
    expect(response.status).toBe(404)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoA.id } })).toEqual(fixture.todoA)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoB.id } })).toEqual(fixture.todoB)
  })

  it.each(['PATCH', 'DELETE'])(
    'prevents user B from using %s on user A’s group and preserves all tasks',
    async (method) => {
      await loginAs(fixture.userB.id)
      const context = { params: Promise.resolve({ groupId: fixture.groupA.id }) }
      const response =
        method === 'PATCH'
          ? await patchGroup(makeRequest('PATCH', { name: 'Hijacked' }), context)
          : await deleteGroup(makeRequest('DELETE'), context)
      expect(response.status).toBe(404)
      expect(await prisma.group.findUnique({ where: { id: fixture.groupA.id } })).toEqual(fixture.groupA)
      expect(await prisma.todo.findMany({ where: { userId: fixture.userA.id }, orderBy: { id: 'asc' } })).toEqual(
        [fixture.todoA, fixture.completedA].sort((a, b) => a.id.localeCompare(b.id)),
      )
      expect(await prisma.todo.findUnique({ where: { id: fixture.todoB.id } })).toEqual(fixture.todoB)
    },
  )

  it('rejects creating a todo in another user’s group without inserting anything', async () => {
    const response = await createTodo(makeRequest('POST', { title: 'Cross-user task', groupId: fixture.groupB.id }))
    expect(response.status).toBe(400)
    expect(await prisma.todo.count({ where: { userId: fixture.userA.id } })).toBe(2)
    expect(await prisma.todo.count({ where: { groupId: fixture.groupB.id } })).toBe(1)
  })

  it('rejects moving a todo to another user’s group without updating it', async () => {
    const response = await patchTodo(makeRequest('PATCH', { groupId: fixture.groupB.id }), {
      params: Promise.resolve({ todoId: fixture.todoA.id }),
    })
    expect(response.status).toBe(400)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoA.id } })).toEqual(fixture.todoA)
  })

  it('creates a todo owned by the logged-in user, ignoring a userId supplied in the body', async () => {
    const response = await createTodo(
      makeRequest('POST', {
        title: ' New task ',
        groupId: fixture.inboxA.id,
        userId: fixture.userB.id,
      }),
    )
    expect(response.status).toBe(201)
    const body = (await response.json()) as { todo: TTodo; groups: TGroup[] }
    expect(await prisma.todo.findUnique({ where: { id: body.todo.id } })).toMatchObject({
      title: 'New task',
      userId: fixture.userA.id,
      groupId: fixture.inboxA.id,
      priority: 'normal',
      completed: false,
    })
    expect(body.groups.find((group) => group.id === fixture.inboxA.id)?.todoCount).toBe(1)
    expect(await prisma.todo.count({ where: { userId: fixture.userB.id } })).toBe(1)
  })

  it('persists an owned todo update and deletion through the API', async () => {
    const context = { params: Promise.resolve({ todoId: fixture.todoA.id }) }
    expect((await patchTodo(makeRequest('PATCH', { title: 'Updated', completed: true }), context)).status).toBe(200)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoA.id } })).toMatchObject({
      title: 'Updated',
      completed: true,
    })
    const response = await deleteTodo(makeRequest('DELETE'), context)
    expect(response.status).toBe(200)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoA.id } })).toBeNull()
    const body = (await response.json()) as { groups: TGroup[] }
    expect(body.groups.find((group) => group.id === fixture.groupA.id)?.todoCount).toBe(1)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoB.id } })).toEqual(fixture.todoB)
  })
})
