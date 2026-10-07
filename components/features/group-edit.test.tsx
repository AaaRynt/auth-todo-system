// components/features/group-edit.test.tsx
// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupEdit } from '@/components/features/group-edit'
import { playTrashSound } from '@/lib/play-trash-sound'
import { createDeferred, groups } from '@/tests/frontend/test-helpers'
import type { TGroup } from '@/types/todo'

const router = vi.hoisted(() => ({ replace: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/play-trash-sound', () => ({ playTrashSound: vi.fn() }))
beforeEach(() => {
  router.replace.mockReset()
})
type TRenameGroup = (id: string, name: string) => Promise<TGroup>
type TDeleteGroup = (id: string) => Promise<number>

async function openAction(
  action: 'Rename' | 'Delete',
  options: {
    isActive?: boolean
    group?: TGroup
    onRename?: ReturnType<typeof vi.fn<TRenameGroup>>
    onDelete?: ReturnType<typeof vi.fn<TDeleteGroup>>
  } = {},
) {
  const {
    isActive = true,
    group = groups[0],
    onRename = vi.fn<TRenameGroup>(),
    onDelete = vi.fn<TDeleteGroup>(),
  } = options
  const user = userEvent.setup()
  render(<GroupEdit group={group} isActive={isActive} onRename={onRename} onDelete={onDelete} />)
  await user.click(screen.getByRole('button', { name: `Manage ${group.name}` }))
  await user.click(screen.getByRole('button', { name: action }))
  return { user, onRename, onDelete }
}

describe('GroupEdit', () => {
  it('does not rename unchanged or whitespace-only names', async () => {
    const { user, onRename } = await openAction('Rename')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), ' Work ')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '   ')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(onRename).not.toHaveBeenCalled()
  })

  it('discards a cancelled rename draft', async () => {
    const { user, onRename } = await openAction('Rename')
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Draft')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Manage Work' }))
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Work')
    expect(onRename).not.toHaveBeenCalled()
  })

  it.each([true, false])(
    'renames once with pending actions disabled and navigates only if active=%s',
    async (isActive) => {
      const pending = createDeferred<TGroup>()
      const onRename = vi.fn<TRenameGroup>().mockReturnValue(pending.promise)
      const { user } = await openAction('Rename', { isActive, onRename })
      await user.clear(screen.getByRole('textbox', { name: 'Name' }))
      await user.type(screen.getByRole('textbox', { name: 'Name' }), '  工作 / Plans & ideas  ')
      await user.click(screen.getByRole('button', { name: 'Save' }))
      const saving = screen.getByRole('button', { name: /Saving/ })
      expect(saving).toBeDisabled()
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      await user.click(saving)
      expect(onRename).toHaveBeenCalledExactlyOnceWith('work', '工作 / Plans & ideas')
      expect(router.replace).not.toHaveBeenCalled()
      const updated = { ...groups[0], name: '工作 / Canonical & name' }
      await act(async () => {
        pending.resolve(updated)
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(toast.success).toHaveBeenCalledWith('Group renamed', { position: 'top-center' })
      if (isActive)
        expect(router.replace).toHaveBeenCalledExactlyOnceWith(`/main/group/${encodeURIComponent(updated.name)}`)
      else expect(router.replace).not.toHaveBeenCalled()
    },
  )

  it('preserves a failed rename draft, clears feedback on edit and lets retry succeed', async () => {
    const onRename = vi
      .fn<TRenameGroup>()
      .mockRejectedValueOnce(new Error('Name already exists.'))
      .mockResolvedValueOnce({ ...groups[0], name: 'Personal' })
    const { user } = await openAction('Rename', { onRename })
    const name = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(name)
    await user.type(name, 'Plans')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Name already exists.')
    expect(name).toHaveValue('Plans')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
    expect(router.replace).not.toHaveBeenCalled()
    await user.clear(name)
    await user.type(name, 'Personal')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onRename).toHaveBeenLastCalledWith('work', 'Personal')
    expect(router.replace).toHaveBeenCalledWith('/main/group/Personal')
  })

  it.each([
    [0, 'This empty group will be permanently deleted.'],
    [1, '1 todo will be moved to Inbox'],
    [3, '3 todos will be moved to Inbox'],
  ] as const)('explains deletion of %s tasks and cancels without deleting', async (todoCount, description) => {
    const { user, onDelete } = await openAction('Delete', { group: { ...groups[0], todoCount } })
    expect(screen.getByRole('dialog')).toHaveTextContent(description)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
    expect(router.replace).not.toHaveBeenCalled()
    expect(playTrashSound).not.toHaveBeenCalled()
  })

  it.each([true, false])(
    'deletes once, uses the returned moved count and navigates only if active=%s',
    async (isActive) => {
      const pending = createDeferred<number>()
      const onDelete = vi.fn<TDeleteGroup>().mockReturnValue(pending.promise)
      const { user } = await openAction('Delete', { isActive, onDelete })
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      const deleting = screen.getByRole('button', { name: /Deleting/ })
      expect(deleting).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
      await user.click(deleting)
      expect(onDelete).toHaveBeenCalledExactlyOnceWith('work')
      expect(router.replace).not.toHaveBeenCalled()
      expect(playTrashSound).not.toHaveBeenCalled()
      await act(async () => {
        pending.resolve(5)
      })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(playTrashSound).toHaveBeenCalledOnce()
      expect(toast.info).toHaveBeenCalledWith('Group deleted. 5 todos moved to Inbox.', { position: 'top-center' })
      if (isActive) expect(router.replace).toHaveBeenCalledExactlyOnceWith('/main/group/Inbox')
      else expect(router.replace).not.toHaveBeenCalled()
    },
  )

  it('keeps a failed delete confirmation open, restores actions and lets retry succeed', async () => {
    const onDelete = vi.fn<TDeleteGroup>().mockRejectedValueOnce(new Error('Delete rejected.')).mockResolvedValueOnce(0)
    const { user } = await openAction('Delete', { onDelete })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Delete rejected.', { position: 'top-center' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(router.replace).not.toHaveBeenCalled()
    expect(playTrashSound).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(2)
    expect(toast.info).toHaveBeenCalledWith('Empty group deleted.', { position: 'top-center' })
    expect(router.replace).toHaveBeenCalledWith('/main/group/Inbox')
  })
})
