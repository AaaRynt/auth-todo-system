// lib/workspace-data.ts
import type { TWorkspace, TWorkspaceRole } from '@/types/workspace'

export const defaultWorkspaceName = 'Personal'
export const workspaceNameMaxLength = 80

export const workspaceSelect = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
} as const

export const workspaceMemberSelect = {
  role: true,
  isDefault: true,
  workspace: { select: workspaceSelect },
} as const

type TWorkspaceMembershipRecord = {
  role: TWorkspaceRole
  isDefault: boolean
  workspace: { id: string; name: string; createdAt: Date; updatedAt: Date }
}

export function serializeWorkspace(member: TWorkspaceMembershipRecord): TWorkspace {
  return {
    ...member.workspace,
    role: member.role,
    isDefault: member.isDefault,
    createdAt: member.workspace.createdAt.toISOString(),
    updatedAt: member.workspace.updatedAt.toISOString(),
  }
}

export function normalizeWorkspaceName(name: unknown) {
  return typeof name === 'string' ? name.trim() : ''
}

export function validateWorkspaceName(name: string) {
  if (!name) return 'Workspace name is required.'
  if (name.length > workspaceNameMaxLength)
    return `Workspace name must be ${workspaceNameMaxLength} characters or fewer.`
  return null
}
