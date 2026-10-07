// app/main/todo/todo-page.test.tsx
// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TodoPage } from '@/app/main/todo/todo-page'
import { TodoProvider, useTodoContext } from '@/app/main/todo/todo-provider'
import { createDeferred, groups, jsonResponse, todos } from '@/tests/frontend/test-helpers'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function SearchControl() {
  const { search, setSearch } = useTodoContext()
  return <input aria-label="Search tasks" value={search} onChange={(event) => setSearch(event.target.value)} />
}

function mountPage(groupName?: string) {
  return render(
    <TodoProvider>
      <SearchControl />
      <TodoPage groupName={groupName} />
    </TodoProvider>,
  )
}

function primeInitial(initialTodos = todos) {
  fetchMock.mockResolvedValueOnce(jsonResponse({ todos: initialTodos })).mockResolvedValueOnce(jsonResponse({ groups }))
}

describe('TodoPage interactions', () => {
  it('shows loading and prevents creation until data is loaded', async () => {
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(jsonResponse({ groups }))
    mountPage()
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Todo title' }), 'Task')
    expect(screen.getByText('Loading todos...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    await act(async () => {
      pending.resolve(jsonResponse({ todos: [] }))
    })
    expect(await screen.findByText('No tasks yet. Add your first todo above.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
  })

  it('shows a load error and lets Retry recover into the empty state', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Server offline')).mockResolvedValueOnce(jsonResponse({ groups }))
    mountPage()
    expect(await screen.findByText('Server offline')).toBeInTheDocument()
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(jsonResponse({ groups }))
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }))
    expect(screen.getByText('Loading todos...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    await act(async () => {
      pending.resolve(jsonResponse({ todos: [] }))
    })
    expect(await screen.findByText('No tasks yet. Add your first todo above.')).toBeInTheDocument()
    expect(screen.queryByText('Server offline')).not.toBeInTheDocument()
  })

  it('filters All, Active and Completed without changing the underlying tasks', async () => {
    primeInitial()
    mountPage()
    const user = userEvent.setup()
    expect(await screen.findByText('Write tests')).toBeInTheDocument()
    expect(screen.getByText('Read docs')).toBeInTheDocument()
    expect(screen.getByText('67% completed')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Active' }))
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(screen.queryByText('Read docs')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Completed' }))
    expect(screen.queryByText('Write tests')).not.toBeInTheDocument()
    expect(screen.getByText('Read docs')).toBeInTheDocument()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('searches case-insensitively with trimmed input and shows no-match feedback', async () => {
    primeInitial()
    mountPage()
    await screen.findByText('Write tests')
    const user = userEvent.setup()
    const search = screen.getByRole('textbox', { name: 'Search tasks' })
    await user.type(search, '  WRITE  ')
    expect(screen.getByText('Write tests')).toBeInTheDocument()
    expect(screen.queryByText('Read docs')).not.toBeInTheDocument()
    await user.clear(search)
    await user.type(search, 'no match')
    expect(screen.getByText('No matching tasks. Try a different title.')).toBeInTheDocument()
    await user.clear(search)
    expect(screen.getByText('Read docs')).toBeInTheDocument()
  })

  it('scopes tasks, progress and empty states to the selected group', async () => {
    primeInitial()
    mountPage('Work')
    await screen.findByText('Write tests')
    expect(screen.getByText('Read docs')).toBeInTheDocument()
    expect(screen.queryByText('Buy milk')).not.toBeInTheDocument()
    expect(screen.getByText('50% completed')).toBeInTheDocument()
    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Search tasks' }), 'milk')
    expect(screen.getByText('No matching tasks. Try a different title.')).toBeInTheDocument()
  })

  it('shows group-specific empty state and zero progress', async () => {
    primeInitial([])
    mountPage('Work')
    expect(await screen.findByText('No tasks in this group yet.')).toBeInTheDocument()
    expect(screen.getByText('0% completed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear completed' })).toBeDisabled()
  })

  it('blocks duplicate creation while pending, then displays the new task and clears the input', async () => {
    primeInitial([])
    mountPage('Work')
    await screen.findByText('No tasks in this group yet.')
    const user = userEvent.setup()
    const input = screen.getByRole('textbox', { name: 'Todo title' })
    await user.type(input, 'New task')
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    await user.click(screen.getByRole('button', { name: 'Add' }))
    const button = screen.getByRole('button', { name: 'Adding...' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await act(async () => {
      pending.resolve(jsonResponse({ todo: { ...todos[0], title: 'New task' }, groups }))
    })
    expect(await screen.findByText('New task')).toBeInTheDocument()
    expect(input).toHaveValue('')
    expect(toast.success).toHaveBeenCalledWith('Todo created', expect.any(Object))
  })

  it('preserves the title and restores submission after create failure', async () => {
    primeInitial([])
    mountPage()
    await screen.findByText('No tasks yet. Add your first todo above.')
    const user = userEvent.setup()
    await user.type(screen.getByRole('textbox', { name: 'Todo title' }), 'Keep this title')
    fetchMock.mockRejectedValueOnce(new Error('Create failed'))
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Create failed', expect.any(Object)))
    expect(screen.getByRole('textbox', { name: 'Todo title' })).toHaveValue('Keep this title')
    expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
  })

  it('disables completion while pending and reflects the returned completed state', async () => {
    primeInitial()
    mountPage()
    const checkbox = await screen.findByRole('checkbox', { name: 'Mark Write tests as completed' })
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise)
    await userEvent.setup().click(checkbox)
    expect(checkbox).toBeDisabled()
    await act(async () => {
      pending.resolve(jsonResponse({ todo: { ...todos[0], completed: true }, groups }))
    })
    expect(await screen.findByRole('checkbox', { name: 'Mark Write tests as active' })).toBeChecked()
  })
})
