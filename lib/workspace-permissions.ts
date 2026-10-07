// lib/workspace-permissions.ts
import type { TWorkspacePermission, TWorkspaceRole } from '@/types/workspace'

const permissions: Record<TWorkspaceRole, readonly TWorkspacePermission[]> = {
  OWNER: ['read', 'write', 'manage-members', 'manage-workspace'],
  EDITOR: ['read', 'write'],
  VIEWER: ['read'],
}

export function hasWorkspacePermission(role: TWorkspaceRole | null | undefined, permission: TWorkspacePermission) {
  return role != null && Object.hasOwn(permissions, role) && permissions[role].includes(permission)
}
