// app/api/workspaces/[workspaceId]/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, PATCH } from '@/app/api/workspaces/[workspaceId]/route'
import { workspaceMemberSelect, workspaceSelect } from '@/lib/workspace-data'
import {
  currentUser,
  expectJson,
  expectNoDatabaseCalls,
  expectNoDatabaseWrites,
  makeInvalidJsonRequest,
  makeRequest,
  prismaMock,
  resetApiMocks,
  sessionMock,
} from '@/tests/api-test-helpers'
import type { TWorkspaceRole } from '@/types/workspace'

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

const context = { params: Promise.resolve({ workspaceId: 'space-a' }) }
const workspace = {
  id: 'space-a',
  name: 'Team',
  createdAt: new Date(currentUser.createdAt),
  updatedAt: new Date(currentUser.createdAt),
}
beforeEach(() => {
  resetApiMocks()
  prismaMock.workspaceMember.findUnique.mockResolvedValue({ workspace, role: 'OWNER', isDefault: true })
})

describe('/api/workspaces/[workspaceId]', () => {
  it.each(['GET', 'PATCH'])('requires a session for %s', async (method) => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    await expectJson(
      method === 'GET'
        ? await GET(makeRequest('GET'), context)
        : await PATCH(makeRequest('PATCH', { name: 'New' }), context),
      401,
      { message: 'Unauthorized.' },
    )
    expectNoDatabaseCalls()
  })
  it.each(['GET', 'PATCH'])('hides unavailable workspaces from non-members for %s', async (method) => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue(null)
    await expectJson(
      method === 'GET'
        ? await GET(makeRequest('GET'), context)
        : await PATCH(makeRequest('PATCH', { name: 'New' }), context),
      404,
      { message: 'Workspace not found.' },
    )
    expect(prismaMock.workspaceMember.findUnique).toHaveBeenCalledWith({
      where: { workspaceId_userId: { workspaceId: 'space-a', userId: currentUser.id } },
      select: workspaceMemberSelect,
    })
    expectNoDatabaseWrites()
  })
  it.each<TWorkspaceRole>(['OWNER', 'EDITOR', 'VIEWER'])('allows %s to read', async (role) => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ workspace, role, isDefault: false })
    await expectJson(await GET(makeRequest('GET'), context), 200, {
      workspace: {
        ...workspace,
        createdAt: currentUser.createdAt,
        updatedAt: currentUser.createdAt,
        role,
        isDefault: false,
      },
    })
    expectNoDatabaseWrites()
  })
  it.each(['EDITOR', 'VIEWER'])('rejects %s calling the rename API even when supplying an OWNER role', async (role) => {
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ workspace, role, isDefault: false })
    await expectJson(
      await PATCH(makeRequest('PATCH', { name: 'New', role: 'OWNER', userId: 'owner-id' }), context),
      403,
      { message: 'Forbidden.' },
    )
    expectNoDatabaseWrites()
  })
  it.each([{}, { name: null }, { name: ' ' }, { name: 'a'.repeat(81) }])(
    'validates an owner’s rename request: %j',
    async (body) => {
      expect((await PATCH(makeRequest('PATCH', body), context)).status).toBe(400)
      expectNoDatabaseWrites()
    },
  )
  it('rejects invalid JSON', async () => {
    expect((await PATCH(makeInvalidJsonRequest('PATCH'), context)).status).toBe(400)
    expectNoDatabaseWrites()
  })
  it('allows only an OWNER to rename and repeats ownership in the update predicate', async () => {
    prismaMock.workspace.update.mockResolvedValue({ ...workspace, name: 'New' })
    await expectJson(
      await PATCH(makeRequest('PATCH', { name: ' New ', role: 'VIEWER', id: 'space-b' }), context),
      200,
      {
        workspace: {
          ...workspace,
          name: 'New',
          createdAt: currentUser.createdAt,
          updatedAt: currentUser.createdAt,
          role: 'OWNER',
          isDefault: true,
        },
      },
    )
    expect(prismaMock.workspace.update).toHaveBeenCalledWith({
      where: { id: 'space-a', members: { some: { userId: currentUser.id, role: 'OWNER' } } },
      data: { name: 'New' },
      select: workspaceSelect,
    })
  })
  it('reloads membership on every request so a demoted owner cannot reuse earlier authorization', async () => {
    await GET(makeRequest('GET'), context)
    prismaMock.workspaceMember.findUnique.mockResolvedValue({ workspace, role: 'VIEWER', isDefault: false })
    expect((await PATCH(makeRequest('PATCH', { name: 'New' }), context)).status).toBe(403)
    expect(prismaMock.workspace.update).not.toHaveBeenCalled()
  })
  it('reports an access change between checking and writing as a conflict', async () => {
    prismaMock.workspace.update.mockRejectedValue({ code: 'P2025' })
    await expectJson(await PATCH(makeRequest('PATCH', { name: 'New' }), context), 409, {
      message: 'Workspace access changed. Reload and try again.',
    })
  })
  it('does not expose database details when authorization fails to load', async () => {
    prismaMock.workspaceMember.findUnique.mockRejectedValue(new Error('secret'))
    await expectJson(await GET(makeRequest('GET'), context), 500, { message: 'Failed to load workspace.' })
    expectNoDatabaseWrites()
  })
  it('does not expose database details when renaming fails', async () => {
    prismaMock.workspace.update.mockRejectedValue(new Error('secret'))
    await expectJson(await PATCH(makeRequest('PATCH', { name: 'New' }), context), 500, {
      message: 'Failed to update workspace.',
    })
  })
})
