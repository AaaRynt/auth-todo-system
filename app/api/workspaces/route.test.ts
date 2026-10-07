// app/api/workspaces/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '@/app/api/workspaces/route'
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

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

const workspace = {
  id: 'space-a',
  name: 'Team',
  createdAt: new Date(currentUser.createdAt),
  updatedAt: new Date(currentUser.createdAt),
}
const serialized = {
  ...workspace,
  createdAt: currentUser.createdAt,
  updatedAt: currentUser.createdAt,
  role: 'OWNER',
  isDefault: false,
}
beforeEach(resetApiMocks)

describe('/api/workspaces', () => {
  it.each(['GET', 'POST'])('requires a session for %s before database access', async (method) => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    await expectJson(method === 'GET' ? await GET() : await POST(makeRequest('POST', { name: 'Team' })), 401, {
      message: 'Unauthorized.',
    })
    expectNoDatabaseCalls()
  })
  it('lists only the session user’s memberships, including role and default flag', async () => {
    prismaMock.workspaceMember.findMany.mockResolvedValue([{ workspace, role: 'OWNER', isDefault: false }])
    await expectJson(await GET(), 200, { workspaces: [serialized] })
    expect(prismaMock.workspaceMember.findMany).toHaveBeenCalledWith({
      where: { userId: currentUser.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { workspaceId: 'asc' }],
      select: workspaceMemberSelect,
    })
    expectNoDatabaseWrites()
  })
  it('returns an empty list for a user without memberships', async () => {
    prismaMock.workspaceMember.findMany.mockResolvedValue([])
    await expectJson(await GET(), 200, { workspaces: [] })
  })
  it.each([{}, { name: null }, { name: 123 }, { name: '   ' }])('rejects missing names: %j', async (body) => {
    await expectJson(await POST(makeRequest('POST', body)), 400, { message: 'Workspace name is required.' })
    expectNoDatabaseCalls()
  })
  it('rejects invalid JSON before writing', async () => {
    await expectJson(await POST(makeInvalidJsonRequest('POST')), 400, { message: 'Workspace name is required.' })
    expectNoDatabaseCalls()
  })
  it('rejects overly long names', async () => {
    await expectJson(await POST(makeRequest('POST', { name: 'a'.repeat(81) })), 400, {
      message: 'Workspace name must be 80 characters or fewer.',
    })
    expectNoDatabaseCalls()
  })
  it('creates a workspace and session-derived OWNER atomically, ignoring injected IDs/roles/default flags', async () => {
    prismaMock.workspace.create.mockResolvedValue(workspace)
    await expectJson(
      await POST(
        makeRequest('POST', { name: ' Team ', userId: 'user-b', role: 'VIEWER', isDefault: true, members: [] }),
      ),
      201,
      { workspace: serialized },
    )
    expect(prismaMock.workspace.create).toHaveBeenCalledExactlyOnceWith({
      data: { name: 'Team', members: { create: { userId: currentUser.id, role: 'OWNER' } } },
      select: workspaceSelect,
    })
  })
  it('returns a sanitized error if listing fails', async () => {
    prismaMock.workspaceMember.findMany.mockRejectedValue(new Error('secret connection string'))
    await expectJson(await GET(), 500, { message: 'Failed to load workspaces.' })
  })
  it('returns a sanitized error if nested creation fails', async () => {
    prismaMock.workspace.create.mockRejectedValue(new Error('secret connection string'))
    await expectJson(await POST(makeRequest('POST', { name: 'Team' })), 500, { message: 'Failed to create workspace.' })
  })
})
