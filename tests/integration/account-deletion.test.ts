// tests/integration/account-deletion.test.ts
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DELETE } from '@/app/api/auth/account/route'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { cookieStore } from '@/tests/integration/cookie-store'
import { createFixture, deleteFixture, loginAs, makeRequest, testPassword } from '@/tests/integration/fixtures'
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

describe('real account deletion cascade', () => {
  it('deletes all the user’s sessions, groups and todos while preserving another account', async () => {
    await loginAs(fixture.userB.id)
    const sessionsB = await prisma.session.findMany({ where: { userId: fixture.userB.id } })
    await loginAs(fixture.userA.id)
    expect(await prisma.session.count({ where: { userId: fixture.userA.id } })).toBe(2)
    const response = await DELETE(makeRequest('DELETE', { password: testPassword, userId: fixture.userB.id }))
    expect(response.status).toBe(200)
    expect(await prisma.user.findUnique({ where: { id: fixture.userA.id } })).toBeNull()
    expect(await prisma.session.count({ where: { userId: fixture.userA.id } })).toBe(0)
    expect(await prisma.group.count({ where: { userId: fixture.userA.id } })).toBe(0)
    expect(await prisma.todo.count({ where: { userId: fixture.userA.id } })).toBe(0)
    expect(cookieStore.get('auth-todo-session')).toBeUndefined()
    await expect(getCurrentUser()).resolves.toBeNull()
    expect(await prisma.user.findUnique({ where: { id: fixture.userB.id } })).toEqual(fixture.userB)
    expect(await prisma.session.findMany({ where: { userId: fixture.userB.id } })).toEqual(sessionsB)
    expect(await prisma.group.count({ where: { userId: fixture.userB.id } })).toBe(2)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoB.id } })).toEqual(fixture.todoB)
  })

  it('preserves the account and all related records for a wrong password', async () => {
    const sessionCount = await prisma.session.count({ where: { userId: fixture.userA.id } })
    expect((await DELETE(makeRequest('DELETE', { password: 'WrongPassword123' }))).status).toBe(401)
    expect(await prisma.user.findUnique({ where: { id: fixture.userA.id } })).toEqual(fixture.userA)
    expect(await prisma.session.count({ where: { userId: fixture.userA.id } })).toBe(sessionCount)
    expect(await prisma.group.count({ where: { userId: fixture.userA.id } })).toBe(2)
    expect(await prisma.todo.count({ where: { userId: fixture.userA.id } })).toBe(2)
    expect((await getCurrentUser())?.id).toBe(fixture.userA.id)
  })
})
