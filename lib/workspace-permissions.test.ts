// lib/workspace-permissions.test.ts
import { describe, expect, it } from 'vitest'
import { hasWorkspacePermission } from '@/lib/workspace-permissions'
import type { TWorkspacePermission, TWorkspaceRole } from '@/types/workspace'

describe('workspace permission policy', () => {
  const actions: TWorkspacePermission[] = ['read', 'write', 'manage-members', 'manage-workspace']
  const roles: TWorkspaceRole[] = ['OWNER', 'EDITOR', 'VIEWER']
  const expected = {
    OWNER: [true, true, true, true],
    EDITOR: [true, true, false, false],
    VIEWER: [true, false, false, false],
  }
  for (const role of roles) {
    it.each(actions.map((action, index) => ({ action, allowed: expected[role][index] })))(
      `${role}: $action → $allowed`,
      ({ action, allowed }) => {
        expect(hasWorkspacePermission(role, action)).toBe(allowed)
      },
    )
  }
  it.each([null, undefined, 'ADMIN', 'owner', '__proto__', 'toString'])(
    'denies missing or unknown roles: %s',
    (role) => {
      expect(hasWorkspacePermission(role as TWorkspaceRole | null | undefined, 'read')).toBe(false)
    },
  )
})
