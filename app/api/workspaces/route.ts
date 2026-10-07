// app/api/workspaces/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import {
  normalizeWorkspaceName,
  serializeWorkspace,
  validateWorkspaceName,
  workspaceMemberSelect,
  workspaceSelect,
} from '@/lib/workspace-data'

export const runtime = 'nodejs'

type TWorkspaceRequestBody = { name?: unknown }

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

    const members = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }, { workspaceId: 'asc' }],
      select: workspaceMemberSelect,
    })
    return NextResponse.json({ workspaces: members.map(serializeWorkspace) })
  } catch {
    return NextResponse.json({ message: 'Failed to load workspaces.' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })

    const body = (await request.json().catch(() => null)) as TWorkspaceRequestBody | null
    const name = normalizeWorkspaceName(body?.name)
    const error = validateWorkspaceName(name)
    if (error) return NextResponse.json({ message: error }, { status: 400 })

    // Workspace and its sole OWNER are committed together. Ignore client-supplied IDs/roles.
    const workspace = await prisma.workspace.create({
      data: { name, members: { create: { userId: user.id, role: 'OWNER' } } },
      select: workspaceSelect,
    })
    return NextResponse.json(
      { workspace: serializeWorkspace({ workspace, role: 'OWNER', isDefault: false }) },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ message: 'Failed to create workspace.' }, { status: 500 })
  }
}
