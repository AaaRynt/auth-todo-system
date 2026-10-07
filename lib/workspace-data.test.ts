// lib/workspace-data.test.ts
import { describe, expect, it } from 'vitest'
import { normalizeWorkspaceName, serializeWorkspace, validateWorkspaceName } from '@/lib/workspace-data'

describe('workspace input and serialization', () => {
  it.each([null, undefined, 1, {}, []])('normalizes non-string names to empty: %j', (value) => {
    expect(normalizeWorkspaceName(value)).toBe('')
  })
  it('trims names while preserving case and special characters', () => {
    expect(normalizeWorkspaceName('  Team / A & B  ')).toBe('Team / A & B')
  })
  it('checks required and maximum-length names', () => {
    expect(validateWorkspaceName('')).toBe('Workspace name is required.')
    expect(validateWorkspaceName('a'.repeat(80))).toBeNull()
    expect(validateWorkspaceName('a'.repeat(81))).toBe('Workspace name must be 80 characters or fewer.')
  })
  it('serializes workspace dates and the requesting member’s role', () => {
    const date = new Date('2026-10-07T00:00:00.000Z')
    expect(
      serializeWorkspace({
        role: 'VIEWER',
        isDefault: false,
        workspace: { id: 'space', name: 'Team', createdAt: date, updatedAt: date },
      }),
    ).toEqual({
      id: 'space',
      name: 'Team',
      role: 'VIEWER',
      isDefault: false,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
    })
  })
})
