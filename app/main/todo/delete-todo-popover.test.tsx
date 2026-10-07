// app/main/todo/delete-todo-popover.test.tsx
// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { describe, expect, it, vi } from 'vitest'
import { DeleteTodoPopover } from '@/app/main/todo/delete-todo-popover'
import { playTrashSound } from '@/lib/play-trash-sound'
import { createDeferred, todos } from '@/tests/frontend/test-helpers'

vi.mock('@/lib/play-trash-sound', () => ({ playTrashSound: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }))

async function openDelete(onDelete = vi.fn<(id: string) => Promise<void>>()) {
  const user = userEvent.setup()
  render(<DeleteTodoPopover todo={todos[0]} onDelete={onDelete} />)
  await user.click(screen.getByRole('button', { name: 'Delete todo' }))
  return { user, onDelete }
}

describe('DeleteTodoPopover', () => {
  it('shows the selected task and lets Cancel close without deleting', async () => {
    const { user, onDelete } = await openDelete()
    expect(screen.getByRole('dialog')).toHaveTextContent(todos[0].title)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onDelete).not.toHaveBeenCalled()
    expect(playTrashSound).not.toHaveBeenCalled()
  })

  it('blocks duplicate deletion while pending and closes with sound only after success', async () => {
    const pending = createDeferred<void>()
    const onDelete = vi.fn<(id: string) => Promise<void>>().mockReturnValue(pending.promise)
    const { user } = await openDelete(onDelete)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const deleting = screen.getByRole('button', { name: /Deleting/ })
    expect(deleting).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    await user.click(deleting)
    expect(onDelete).toHaveBeenCalledExactlyOnceWith(todos[0].id)
    expect(playTrashSound).not.toHaveBeenCalled()
    await act(async () => {
      pending.resolve()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(playTrashSound).toHaveBeenCalledOnce()
  })

  it('keeps confirmation open and allows retry after a failed deletion', async () => {
    const onDelete = vi
      .fn<(id: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('Delete failed.'))
      .mockResolvedValueOnce(undefined)
    const { user } = await openDelete(onDelete)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Delete failed.', { position: 'top-center' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled()
    expect(playTrashSound).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(playTrashSound).toHaveBeenCalledOnce()
  })
})
