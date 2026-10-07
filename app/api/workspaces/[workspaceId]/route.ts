// app/api/workspaces/[workspaceId]/route.ts
import { NextResponse } from 'next/server'
import { getWorkspaceAccess } from '@/lib/auth/workspace-access'
import { prisma } from '@/lib/prisma'
import {
  normalizeWorkspaceName,
  serializeWorkspace,
  validateWorkspaceName,
  workspaceSelect,
} from '@/lib/workspace-data'

export const runtime = 'nodejs'

type TRouteContext = { params: Promise<{ workspaceId: string }> }
type TWorkspaceRequestBody = { name?: unknown }

export async function GET(_request: Request, context: TRouteContext) {
  try {
    const { workspaceId } = await context.params
    const access = await getWorkspaceAccess(workspaceId, 'read')
    if (!access.allowed) return access.response
    return NextResponse.json({ workspace: serializeWorkspace(access.member) })
  } catch {
    return NextResponse.json({ message: 'Failed to load workspace.' }, { status: 500 })
  }
}

export async function PATCH(request: Request, context: TRouteContext) {
  try {
    const { workspaceId } = await context.params
    const access = await getWorkspaceAccess(workspaceId, 'manage-workspace')
    if (!access.allowed) return access.response

    const body = (await request.json().catch(() => null)) as TWorkspaceRequestBody | null
    const name = normalizeWorkspaceName(body?.name)
    const error = validateWorkspaceName(name)
    if (error) return NextResponse.json({ message: error }, { status: 400 })

    // Recheck OWNER in the write predicate as well as the preceding access check.
    const workspace = await prisma.workspace.update({
      where: { id: workspaceId, members: { some: { userId: access.user.id, role: 'OWNER' } } },
      data: { name },
      select: workspaceSelect,
    })
    return NextResponse.json({ workspace: serializeWorkspace({ ...access.member, workspace }) })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ message: 'Workspace access changed. Reload and try again.' }, { status: 409 })
    }
    return NextResponse.json({ message: 'Failed to update workspace.' }, { status: 500 })
  }
}
