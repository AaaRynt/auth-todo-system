// app/main/todo/todo-edit-dialog.test.tsx
// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TodoEditDialog } from '@/app/main/todo/todo-edit-dialog'
import { createDeferred, todos } from '@/tests/frontend/test-helpers'
import type { TTodo } from '@/types/todo'

vi.mock('sonner', () => ({ toast: { success: vi.fn() } }))
type TUpdateTodo = (id: string, updates: Partial<Pick<TTodo, 'title' | 'group' | 'priority'>>) => Promise<void>
const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
beforeEach(() => {
  // Radix Select scrolls its keyboard selection; jsdom has no layout to scroll.
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
})
afterEach(() => {
  if (originalScrollIntoView) Object.defineProperty(Element.prototype, 'scrollIntoView', originalScrollIntoView)
  else Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

async function openEditor(onUpdate = vi.fn<TUpdateTodo>(), todo = todos[0]) {
  const view = render(<TodoEditDialog todo={todo} groups={['Work', 'Inbox']} onUpdate={onUpdate} />)
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Edit todo' }))
  return { ...view, user, onUpdate }
}

async function chooseInbox(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('combobox', { name: 'Group' }))
  await user.click(screen.getByRole('button', { name: 'Inbox' }))
}

async function chooseUrgent(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole('combobox', { name: 'Priority' }).focus()
  await user.keyboard('{ArrowDown}')
  await user.keyboard('{End}{Enter}')
}

describe('TodoEditDialog', () => {
  it('prevents editing a completed task', async () => {
    const onUpdate = vi.fn<TUpdateTodo>()
    render(<TodoEditDialog todo={todos[1]} groups={['Work', 'Inbox']} onUpdate={onUpdate} />)
    const button = screen.getByRole('button', { name: 'Edit todo' })
    expect(button).toBeDisabled()
    await userEvent.setup().click(button)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('opens with the current title, group and priority', async () => {
    await openEditor()
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(todos[0].title)
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveTextContent('Work')
    expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('High')
  })

  it('prevents submitting a whitespace-only title', async () => {
    const { user, onUpdate } = await openEditor()
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), '   ')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('discards all draft fields after cancelling and reopening', async () => {
    const { user, onUpdate } = await openEditor()
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Unsaved title')
    await chooseInbox(user)
    await chooseUrgent(user)
    expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('Urgent')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onUpdate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Edit todo' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(todos[0].title)
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveTextContent('Work')
    expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('High')
  })

  it('reads updated task props when reopened', async () => {
    const { user, onUpdate, rerender } = await openEditor()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    const updated: TTodo = { ...todos[0], title: 'Server title', group: 'Inbox', groupId: 'inbox', priority: 'low' }
    rerender(<TodoEditDialog todo={updated} groups={['Work', 'Inbox']} onUpdate={onUpdate} />)
    await user.click(screen.getByRole('button', { name: 'Edit todo' }))
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Server title')
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveTextContent('Inbox')
    expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('Low')
  })

  it('saves the selected group and priority once, then closes after the request succeeds', async () => {
    const pending = createDeferred<void>()
    const onUpdate = vi.fn<TUpdateTodo>().mockReturnValue(pending.promise)
    const { user } = await openEditor(onUpdate)
    const title = screen.getByRole('textbox', { name: 'Name' })
    await user.clear(title)
    await user.type(title, 'Updated title')
    await chooseInbox(user)
    await chooseUrgent(user)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(title).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    const saving = screen.getByRole('button', { name: /Saving/ })
    expect(saving).toBeDisabled()
    await user.click(saving)
    expect(onUpdate).toHaveBeenCalledExactlyOnceWith(todos[0].id, {
      title: 'Updated title',
      group: 'Inbox',
      priority: 'urgent',
    })
    expect(toast.success).not.toHaveBeenCalled()
    await act(async () => {
      pending.resolve()
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(toast.success).toHaveBeenCalledWith('Todo updated', { position: 'top-center' })
  })

  it('retains the draft on failure and lets a successful retry close the dialog', async () => {
    const onUpdate = vi
      .fn<TUpdateTodo>()
      .mockRejectedValueOnce(new Error('Update rejected.'))
      .mockResolvedValueOnce(undefined)
    const { user } = await openEditor(onUpdate)
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Keep this draft')
    await chooseInbox(user)
    await chooseUrgent(user)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Update rejected.')
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Keep this draft')
    expect(screen.getByRole('combobox', { name: 'Group' })).toHaveTextContent('Inbox')
    expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('Urgent')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onUpdate).toHaveBeenCalledTimes(2)
  })
})
