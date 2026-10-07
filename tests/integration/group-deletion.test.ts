// tests/integration/group-deletion.test.ts
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DELETE } from '@/app/api/groups/[groupId]/route'
import { prisma } from '@/lib/prisma'
import { createFixture, deleteFixture, makeRequest } from '@/tests/integration/fixtures'
import type { TIntegrationFixture } from '@/tests/integration/fixtures'
import type { TGroup } from '@/types/todo'

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

describe('real group deletion transaction', () => {
  it.each([true, false])('preserves tasks in the user’s Inbox (Inbox exists: %s)', async (inboxExists) => {
    if (!inboxExists) await prisma.group.delete({ where: { id: fixture.inboxA.id } })
    const response = await DELETE(makeRequest('DELETE'), { params: Promise.resolve({ groupId: fixture.groupA.id }) })
    expect(response.status).toBe(200)
    const body = (await response.json()) as { destinationGroup: TGroup }
    expect(body.destinationGroup).toMatchObject({ name: 'Inbox', todoCount: 2 })
    expect(await prisma.group.findUnique({ where: { id: fixture.groupA.id } })).toBeNull()
    expect(await prisma.group.findUnique({ where: { id: body.destinationGroup.id } })).toMatchObject({
      userId: fixture.userA.id,
      name: 'Inbox',
    })
    for (const original of [fixture.todoA, fixture.completedA]) {
      expect(await prisma.todo.findUnique({ where: { id: original.id } })).toMatchObject({
        id: original.id,
        userId: fixture.userA.id,
        groupId: body.destinationGroup.id,
        title: original.title,
        priority: original.priority,
        completed: original.completed,
        createdAt: original.createdAt,
      })
    }
    expect(await prisma.todo.count({ where: { userId: fixture.userA.id } })).toBe(2)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoB.id } })).toEqual(fixture.todoB)
    expect(await prisma.group.findUnique({ where: { id: fixture.inboxB.id } })).toEqual(fixture.inboxB)
  })

  it.each([true, false])(
    'rolls back moved tasks and any newly created Inbox when group deletion fails (Inbox exists: %s)',
    async (inboxExists) => {
      if (!inboxExists) await prisma.group.delete({ where: { id: fixture.inboxA.id } })
      // A real PostgreSQL trigger fails the DELETE after updateMany has executed inside the transaction.
      await prisma.$executeRawUnsafe(`CREATE FUNCTION integration_fail_group_delete() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'Injected group delete failure'; END; $$`)
      try {
        await prisma.$executeRawUnsafe(`CREATE TRIGGER integration_fail_group_delete BEFORE DELETE ON "Group"
        FOR EACH ROW EXECUTE FUNCTION integration_fail_group_delete()`)
        try {
          await expect(
            DELETE(makeRequest('DELETE'), { params: Promise.resolve({ groupId: fixture.groupA.id }) }),
          ).rejects.toThrow('Injected group delete failure')
          expect(await prisma.group.findUnique({ where: { id: fixture.groupA.id } })).toEqual(fixture.groupA)
          expect(await prisma.todo.findUnique({ where: { id: fixture.todoA.id } })).toEqual(fixture.todoA)
          expect(await prisma.todo.findUnique({ where: { id: fixture.completedA.id } })).toEqual(fixture.completedA)
          expect(await prisma.group.count({ where: { userId: fixture.userA.id, name: 'Inbox' } })).toBe(
            inboxExists ? 1 : 0,
          )
          expect(await prisma.todo.findUnique({ where: { id: fixture.todoB.id } })).toEqual(fixture.todoB)
        } finally {
          await prisma.$executeRawUnsafe('DROP TRIGGER integration_fail_group_delete ON "Group"')
        }
      } finally {
        await prisma.$executeRawUnsafe('DROP FUNCTION integration_fail_group_delete()')
      }
    },
  )
})
