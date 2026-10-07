// lib/auth/workspace-access.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { workspaceMemberSelect } from '@/lib/workspace-data'
import { hasWorkspacePermission } from '@/lib/workspace-permissions'
import type { TWorkspacePermission } from '@/types/workspace'

export async function getWorkspaceAccess(workspaceId: string, permission: TWorkspacePermission) {
  const user = await getCurrentUser()
  if (!user) {
    return { allowed: false, response: NextResponse.json({ message: 'Unauthorized.' }, { status: 401 }) } as const
  }

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    select: workspaceMemberSelect,
  })
  // Use the same response for an unknown workspace and a workspace the user cannot access.
  if (!member) {
    return {
      allowed: false,
      response: NextResponse.json({ message: 'Workspace not found.' }, { status: 404 }),
    } as const
  }
  if (!hasWorkspacePermission(member.role, permission)) {
    return { allowed: false, response: NextResponse.json({ message: 'Forbidden.' }, { status: 403 }) } as const
  }
  return { allowed: true, user, member } as const
}
