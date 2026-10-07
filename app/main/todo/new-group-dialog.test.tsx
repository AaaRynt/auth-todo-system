// app/main/todo/new-group-dialog.test.tsx
// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NewGroupDialog } from '@/app/main/todo/new-group-dialog'
import { createDeferred, groups } from '@/tests/frontend/test-helpers'
import type { TGroup } from '@/types/todo'

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => router }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
beforeEach(() => {
  router.push.mockReset()
})
type TCreateGroup = (name: string) => Promise<TGroup>

async function openCreate(onCreateGroup = vi.fn<TCreateGroup>(), initialGroups = groups) {
  const user = userEvent.setup()
  render(<NewGroupDialog groups={initialGroups} onCreateGroup={onCreateGroup} />)
  await user.click(screen.getByRole('button', { name: 'New Group' }))
  return { user, onCreateGroup }
}

describe('NewGroupDialog', () => {
  it('disables empty and whitespace-only names', async () => {
    const { user, onCreateGroup } = await openCreate()
    expect(screen.getByRole('button', { name: 'Create group' })).toBeDisabled()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '   ')
    expect(screen.getByRole('button', { name: 'Create group' })).toBeDisabled()
    expect(onCreateGroup).not.toHaveBeenCalled()
  })

  it('discards a cancelled draft', async () => {
    const { user, onCreateGroup } = await openCreate()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Draft')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'New Group' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
    expect(onCreateGroup).not.toHaveBeenCalled()
  })

  it('opens a case-insensitively matching existing group with its encoded original name', async () => {
    const name = '工作 / Plans & ideas'
    const { user, onCreateGroup } = await openCreate(undefined, [{ id: 'special', name, todoCount: 0 }])
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '  工作 / pLANS & IDEAS  ')
    await user.click(screen.getByRole('button', { name: 'Create group' }))
    expect(onCreateGroup).not.toHaveBeenCalled()
    expect(router.push).toHaveBeenCalledExactlyOnceWith(`/main/group/${encodeURIComponent(name)}`)
    expect(toast.info).toHaveBeenCalledWith('Group already exists', { position: 'top-center' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('trims a new name, blocks repeated clicks and uses the returned name for navigation', async () => {
    const pending = createDeferred<TGroup>()
    const onCreateGroup = vi.fn<TCreateGroup>().mockReturnValue(pending.promise)
    const { user } = await openCreate(onCreateGroup)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '  工作 / Ideas  ')
    await user.click(screen.getByRole('button', { name: 'Create group' }))
    const creating = screen.getByRole('button', { name: /Creating/ })
    expect(creating).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.click(creating)
    expect(onCreateGroup).toHaveBeenCalledExactlyOnceWith('工作 / Ideas')
    expect(router.push).not.toHaveBeenCalled()
    const created = { id: 'new', name: '工作 / Ideas & Notes', todoCount: 0 }
    await act(async () => {
      pending.resolve(created)
    })
    expect(router.push).toHaveBeenCalledWith(`/main/group/${encodeURIComponent(created.name)}`)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Group created', { position: 'top-center' })
    await user.click(screen.getByRole('button', { name: 'New Group' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('')
  })

  it('keeps the draft and restores actions after failure, then allows retry', async () => {
    const onCreateGroup = vi
      .fn<TCreateGroup>()
      .mockRejectedValueOnce(new Error('Cannot create group.'))
      .mockResolvedValueOnce({ id: 'new', name: 'Plans', todoCount: 0 })
    const { user } = await openCreate(onCreateGroup)
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Plans')
    await user.click(screen.getByRole('button', { name: 'Create group' }))
    expect(toast.error).toHaveBeenCalledWith('Cannot create group.', { position: 'top-center' })
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Plans')
    expect(screen.getByRole('button', { name: 'Create group' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(router.push).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Create group' }))
    expect(onCreateGroup).toHaveBeenCalledTimes(2)
    expect(router.push).toHaveBeenCalledWith('/main/group/Plans')
  })
})
