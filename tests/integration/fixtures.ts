// tests/integration/fixtures.ts
import { randomUUID } from 'node:crypto'
import { hashPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { clearCookies } from '@/tests/integration/cookie-store'

export const testPassword = 'IntegrationPassword123'

export async function loginAs(userId: string) {
  clearCookies()
  await createSession(userId)
}

export async function createFixture() {
  const passwordHash = await hashPassword(testPassword)
  const userA = await prisma.user.create({
    data: {
      username: `integration-a-${randomUUID()}`,
      nickname: 'User A',
      passwordHash,
      workspaceMembers: { create: { role: 'OWNER', isDefault: true, workspace: { create: { name: 'Personal' } } } },
    },
  })
  const userB = await prisma.user.create({
    data: {
      username: `integration-b-${randomUUID()}`,
      nickname: 'User B',
      passwordHash,
      workspaceMembers: { create: { role: 'OWNER', isDefault: true, workspace: { create: { name: 'Personal' } } } },
    },
  })
  const inboxA = await prisma.group.create({ data: { userId: userA.id, name: 'Inbox' } })
  const groupA = await prisma.group.create({ data: { userId: userA.id, name: 'Work' } })
  const inboxB = await prisma.group.create({ data: { userId: userB.id, name: 'Inbox' } })
  const groupB = await prisma.group.create({ data: { userId: userB.id, name: 'Work' } })
  const todoA = await prisma.todo.create({
    data: { userId: userA.id, groupId: groupA.id, title: 'A task', priority: 'high' },
  })
  const completedA = await prisma.todo.create({
    data: { userId: userA.id, groupId: groupA.id, title: 'A completed task', completed: true, priority: 'urgent' },
  })
  const todoB = await prisma.todo.create({ data: { userId: userB.id, groupId: groupB.id, title: 'B task' } })
  await loginAs(userA.id)
  const workspaceA = await prisma.workspace.findFirstOrThrow({
    where: { members: { some: { userId: userA.id, isDefault: true } } },
  })
  const workspaceB = await prisma.workspace.findFirstOrThrow({
    where: { members: { some: { userId: userB.id, isDefault: true } } },
  })
  return { userA, userB, workspaceA, workspaceB, inboxA, groupA, inboxB, groupB, todoA, completedA, todoB }
}

export type TIntegrationFixture = Awaited<ReturnType<typeof createFixture>>

export async function deleteFixture(fixture: TIntegrationFixture | undefined) {
  clearCookies()
  if (fixture) {
    await prisma.workspace.deleteMany({
      where: { members: { some: { userId: { in: [fixture.userA.id, fixture.userB.id] } } } },
    })
    await prisma.user.deleteMany({ where: { id: { in: [fixture.userA.id, fixture.userB.id] } } })
  }
}

export function makeRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/test', {
    method,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
}
