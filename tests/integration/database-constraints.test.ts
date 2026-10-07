// tests/integration/database-constraints.test.ts
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@/lib/prisma'
import { createFixture, deleteFixture } from '@/tests/integration/fixtures'
import type { TIntegrationFixture } from '@/tests/integration/fixtures'

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

describe('real database constraints', () => {
  it('rejects inserting a todo with another user’s group even when bypassing the API', async () => {
    await expect(
      prisma.todo.create({
        data: {
          title: 'Cross-user task',
          userId: fixture.userA.id,
          groupId: fixture.groupB.id,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' })
    expect(await prisma.todo.count({ where: { userId: fixture.userA.id } })).toBe(2)
    expect(await prisma.todo.count({ where: { groupId: fixture.groupB.id } })).toBe(1)
  })

  it('rejects updating a todo to another user’s group even when bypassing the API', async () => {
    await expect(
      prisma.todo.update({ where: { id: fixture.todoA.id }, data: { groupId: fixture.groupB.id } }),
    ).rejects.toMatchObject({ code: 'P2003' })
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoA.id } })).toEqual(fixture.todoA)
  })

  it('rejects duplicate group names for one user while allowing the same name for another', async () => {
    expect(fixture.groupA.name).toBe(fixture.groupB.name)
    await expect(prisma.group.create({ data: { userId: fixture.userA.id, name: 'Work' } })).rejects.toMatchObject({
      code: 'P2002',
    })
    expect(
      await prisma.group.count({ where: { name: 'Work', userId: { in: [fixture.userA.id, fixture.userB.id] } } }),
    ).toBe(2)
  })
})
