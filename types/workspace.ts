// types/workspace.ts
import type { WorkspaceRole } from '@/app/generated/prisma/enums'

export type TWorkspaceRole = WorkspaceRole
export type TWorkspacePermission = 'read' | 'write' | 'manage-members' | 'manage-workspace'

export type TWorkspace = {
  id: string
  name: string
  role: TWorkspaceRole
  isDefault: boolean
  createdAt: string
  updatedAt: string
}
