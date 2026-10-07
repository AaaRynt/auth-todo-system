// tests/integration/workspaces.test.ts
import { randomUUID } from 'node:crypto'
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DELETE as deleteAccount } from '@/app/api/auth/account/route'
import { POST as register } from '@/app/api/auth/register/route'
import { GET as getWorkspace, PATCH as renameWorkspace } from '@/app/api/workspaces/[workspaceId]/route'
import { POST as createWorkspace, GET as listWorkspaces } from '@/app/api/workspaces/route'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { clearCookies } from '@/tests/integration/cookie-store'
import { createFixture, deleteFixture, loginAs, makeRequest, testPassword } from '@/tests/integration/fixtures'
import type { TIntegrationFixture } from '@/tests/integration/fixtures'
import type { TWorkspaceRole } from '@/types/workspace'

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
const context = (workspaceId: string) => ({ params: Promise.resolve({ workspaceId }) })

describe('workspace API with real sessions and PostgreSQL', () => {
  it('registers an account, default workspace and OWNER membership together before creating a session', async () => {
    clearCookies()
    const username = `registered-${randomUUID()}`
    try {
      expect(
        (
          await register(
            makeRequest('POST', { username, password: testPassword, role: 'VIEWER', userId: fixture.userB.id }),
          )
        ).status,
      ).toBe(200)
      const user = await prisma.user.findUniqueOrThrow({ where: { username } })
      const members = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: { workspace: true },
      })
      expect(members).toHaveLength(1)
      expect(members[0]).toMatchObject({ role: 'OWNER', isDefault: true, workspace: { name: 'Personal' } })
      expect((await getCurrentUser())?.id).toBe(user.id)
      expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1)
      expect((await register(makeRequest('POST', { username, password: testPassword }))).status).toBe(409)
      expect(await prisma.workspaceMember.count({ where: { userId: user.id } })).toBe(1)
      expect(await prisma.session.count({ where: { userId: user.id } })).toBe(1)
    } finally {
      clearCookies()
      await prisma.workspace.deleteMany({ where: { members: { some: { user: { username } } } } })
      await prisma.user.deleteMany({ where: { username } })
    }
  })

  it('lists only the current user’s spaces, puts the default first, and creates additional spaces as OWNER', async () => {
    const response = await createWorkspace(
      makeRequest('POST', { name: ' Team ', userId: fixture.userB.id, role: 'VIEWER', isDefault: true }),
    )
    expect(response.status).toBe(201)
    const { workspace } = await response.json()
    expect(workspace).toMatchObject({ name: 'Team', role: 'OWNER', isDefault: false })
    expect(await prisma.workspaceMember.findMany({ where: { workspaceId: workspace.id } })).toMatchObject([
      { userId: fixture.userA.id, role: 'OWNER', isDefault: false },
    ])
    const result = await (await listWorkspaces()).json()
    expect(result.workspaces.map((space: { id: string }) => space.id)).toEqual([fixture.workspaceA.id, workspace.id])
    await loginAs(fixture.userB.id)
    expect((await (await listWorkspaces()).json()).workspaces.map((space: { id: string }) => space.id)).toEqual([
      fixture.workspaceB.id,
    ])
  })

  it('denies non-member access and uses the same response for missing workspaces', async () => {
    for (const id of [fixture.workspaceB.id, randomUUID()]) {
      const response = await getWorkspace(makeRequest('GET'), context(id))
      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ message: 'Workspace not found.' })
      expect((await renameWorkspace(makeRequest('PATCH', { name: 'Injected' }), context(id))).status).toBe(404)
    }
    expect(await prisma.workspace.findUnique({ where: { id: fixture.workspaceB.id } })).toEqual(fixture.workspaceB)
  })

  it.each<TWorkspaceRole>(['EDITOR', 'VIEWER'])(
    'allows %s to read but rejects directly renaming shared space',
    async (role) => {
      await prisma.workspaceMember.create({
        data: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id, role },
      })
      await loginAs(fixture.userB.id)
      const result = await getWorkspace(makeRequest('GET'), context(fixture.workspaceA.id))
      expect(result.status).toBe(200)
      expect((await result.json()).workspace).toMatchObject({ role, isDefault: false })
      expect(
        (
          await renameWorkspace(
            makeRequest('PATCH', { name: 'Injected', role: 'OWNER', userId: fixture.userA.id }),
            context(fixture.workspaceA.id),
          )
        ).status,
      ).toBe(403)
      expect(await prisma.workspace.findUnique({ where: { id: fixture.workspaceA.id } })).toEqual(fixture.workspaceA)
    },
  )

  it('allows the actual owner to rename only the requested space', async () => {
    expect(
      (
        await renameWorkspace(
          makeRequest('PATCH', { name: ' Renamed ', id: fixture.workspaceB.id }),
          context(fixture.workspaceA.id),
        )
      ).status,
    ).toBe(200)
    expect((await prisma.workspace.findUniqueOrThrow({ where: { id: fixture.workspaceA.id } })).name).toBe('Renamed')
    expect(await prisma.workspace.findUnique({ where: { id: fixture.workspaceB.id } })).toEqual(fixture.workspaceB)
  })

  it('does not cache membership in the session after a member is removed', async () => {
    await prisma.workspaceMember.create({
      data: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id, role: 'VIEWER' },
    })
    await loginAs(fixture.userB.id)
    expect((await getWorkspace(makeRequest('GET'), context(fixture.workspaceA.id))).status).toBe(200)
    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id } },
    })
    expect((await getWorkspace(makeRequest('GET'), context(fixture.workspaceA.id))).status).toBe(404)
    expect((await getCurrentUser())?.id).toBe(fixture.userB.id)
  })

  it('requires a real session and creates nothing for an unauthenticated request', async () => {
    clearCookies()
    const count = await prisma.workspace.count()
    expect((await listWorkspaces()).status).toBe(401)
    expect((await createWorkspace(makeRequest('POST', { name: 'Anonymous' }))).status).toBe(401)
    expect((await getWorkspace(makeRequest('GET'), context(fixture.workspaceA.id))).status).toBe(401)
    expect(
      (await renameWorkspace(makeRequest('PATCH', { name: 'Anonymous' }), context(fixture.workspaceA.id))).status,
    ).toBe(401)
    expect(await prisma.workspace.count()).toBe(count)
  })
})

describe('workspace constraints and account lifecycle', () => {
  it('rejects a workspace without an owner and rolls back the workspace', async () => {
    const id = randomUUID()
    await expect(prisma.workspace.create({ data: { id, name: 'No owner' } })).rejects.toThrow()
    expect(await prisma.workspace.findUnique({ where: { id } })).toBeNull()
  })

  it('rejects deleting or demoting the sole owner without a replacement', async () => {
    const where = { workspaceId_userId: { workspaceId: fixture.workspaceA.id, userId: fixture.userA.id } }
    await expect(prisma.workspaceMember.delete({ where })).rejects.toThrow()
    await expect(prisma.workspaceMember.update({ where, data: { role: 'EDITOR' } })).rejects.toThrow()
    expect((await prisma.workspaceMember.findUniqueOrThrow({ where })).role).toBe('OWNER')
  })

  it('allows an atomic demote/promote transfer while keeping exactly one owner after commit', async () => {
    await prisma.workspaceMember.create({
      data: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id, role: 'VIEWER' },
    })
    await prisma.$transaction(async (tx) => {
      await tx.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId: fixture.workspaceA.id, userId: fixture.userA.id } },
        data: { role: 'EDITOR' },
      })
      await tx.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id } },
        data: { role: 'OWNER' },
      })
    })
    expect(
      (
        await prisma.workspaceMember.findUniqueOrThrow({
          where: { workspaceId_userId: { workspaceId: fixture.workspaceA.id, userId: fixture.userA.id } },
        })
      ).role,
    ).toBe('EDITOR')
    expect(
      (
        await prisma.workspaceMember.findUniqueOrThrow({
          where: { workspaceId_userId: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id } },
        })
      ).role,
    ).toBe('OWNER')
    expect(await prisma.workspaceMember.count({ where: { workspaceId: fixture.workspaceA.id, role: 'OWNER' } })).toBe(1)
  })

  it('prevents two owners in a workspace while allowing the same user to have different roles across spaces', async () => {
    await expect(
      prisma.workspaceMember.create({
        data: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id, role: 'OWNER' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' })
    await prisma.workspaceMember.create({
      data: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id, role: 'VIEWER' },
    })
    expect(
      await prisma.workspaceMember.findMany({ where: { userId: fixture.userB.id }, select: { role: true } }),
    ).toEqual(expect.arrayContaining([{ role: 'OWNER' }, { role: 'VIEWER' }]))
  })

  it('prevents duplicate memberships and multiple defaults for a user', async () => {
    await expect(
      prisma.workspaceMember.create({
        data: { workspaceId: fixture.workspaceA.id, userId: fixture.userA.id, role: 'EDITOR' },
      }),
    ).rejects.toMatchObject({ code: 'P2002' })
    await expect(
      prisma.workspaceMember.create({
        data: { workspaceId: fixture.workspaceB.id, userId: fixture.userA.id, role: 'EDITOR', isDefault: true },
      }),
    ).rejects.toMatchObject({ code: 'P2002' })
    expect(await prisma.workspaceMember.count({ where: { userId: fixture.userA.id } })).toBe(1)
  })

  it('rolls back the parent workspace when its nested OWNER cannot be created', async () => {
    const id = randomUUID()
    await expect(
      prisma.workspace.create({
        data: { id, name: 'Will roll back', members: { create: { userId: randomUUID(), role: 'OWNER' } } },
      }),
    ).rejects.toMatchObject({ code: 'P2003' })
    expect(await prisma.workspace.findUnique({ where: { id } })).toBeNull()
  })

  it('preserves all workspaces, private data and session when a shared owner attempts account deletion', async () => {
    await prisma.workspaceMember.create({
      data: { workspaceId: fixture.workspaceA.id, userId: fixture.userB.id, role: 'EDITOR' },
    })
    expect((await deleteAccount(makeRequest('DELETE', { password: testPassword }))).status).toBe(409)
    expect(await prisma.user.findUnique({ where: { id: fixture.userA.id } })).toEqual(fixture.userA)
    expect(await prisma.workspace.findUnique({ where: { id: fixture.workspaceA.id } })).toEqual(fixture.workspaceA)
    expect(await prisma.workspaceMember.count({ where: { workspaceId: fixture.workspaceA.id } })).toBe(2)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoA.id } })).toEqual(fixture.todoA)
    expect((await getCurrentUser())?.id).toBe(fixture.userA.id)
  })

  it('deletes solo owned spaces on account deletion but retains spaces owned by other members', async () => {
    await prisma.workspaceMember.create({
      data: { workspaceId: fixture.workspaceB.id, userId: fixture.userA.id, role: 'EDITOR' },
    })
    expect((await deleteAccount(makeRequest('DELETE', { password: testPassword }))).status).toBe(200)
    expect(await prisma.workspace.findUnique({ where: { id: fixture.workspaceA.id } })).toBeNull()
    expect(await prisma.workspaceMember.count({ where: { userId: fixture.userA.id } })).toBe(0)
    expect(await prisma.workspace.findUnique({ where: { id: fixture.workspaceB.id } })).toEqual(fixture.workspaceB)
    expect(await prisma.workspaceMember.count({ where: { workspaceId: fixture.workspaceB.id, role: 'OWNER' } })).toBe(1)
    expect(await prisma.todo.findUnique({ where: { id: fixture.todoB.id } })).toEqual(fixture.todoB)
  })
})
