// app/main/todo/todo-provider.test.tsx
// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TodoProvider, useTodoContext } from '@/app/main/todo/todo-provider'
import { createDeferred, groups, jsonResponse, todos } from '@/tests/frontend/test-helpers'

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

function primeInitial(initialTodos = todos, initialGroups = groups) {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ todos: initialTodos }))
    .mockResolvedValueOnce(jsonResponse({ groups: initialGroups }))
}

async function mountProvider() {
  const hook = renderHook(useTodoContext, { wrapper: TodoProvider })
  await waitFor(() => expect(hook.result.current.isLoading).toBe(false))
  expect(hook.result.current.loadError).toBe('')
  return hook
}

describe('TodoProvider', () => {
  it('starts loading, requests both endpoints with credentials, then loads sorted groups', async () => {
    const pending = createDeferred<Response>()
    fetchMock.mockReturnValueOnce(pending.promise).mockResolvedValueOnce(jsonResponse({ groups }))
    const { result } = renderHook(useTodoContext, { wrapper: TodoProvider })
    expect(result.current.isLoading).toBe(true)
    expect(result.current.todos).toEqual([])
    expect(fetchMock).toHaveBeenCalledWith('/api/todos', expect.objectContaining({ credentials: 'same-origin' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/groups', expect.objectContaining({ credentials: 'same-origin' }))
    await act(async () => {
      pending.resolve(jsonResponse({ todos }))
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.todos).toEqual(todos)
    expect(result.current.groups.map((group) => group.name)).toEqual(['Inbox', 'Work'])
  })

  it('handles a successful empty response', async () => {
    primeInitial([], [])
    const { result } = await mountProvider()
    expect(result.current.todos).toEqual([])
    expect(result.current.groups).toEqual([])
  })

  it.each(['network', 'http', 'invalid-json'])('ends loading and exposes a %s failure', async (failure) => {
    if (failure === 'network') fetchMock.mockRejectedValueOnce(new Error('Network offline'))
    else if (failure === 'http') fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Unauthorized.' }, 401))
    else fetchMock.mockResolvedValueOnce(new Response('invalid-json'))
    fetchMock.mockResolvedValueOnce(jsonResponse({ groups }))
    const { result } = renderHook(useTodoContext, { wrapper: TodoProvider })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.loadError).toBe(
      failure === 'network' ? 'Network offline' : failure === 'http' ? 'Unauthorized.' : 'Invalid server response.',
    )
    expect(result.current.todos).toEqual([])
  })

  it('recovers from an initial failure on reload', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(jsonResponse({ groups }))
    const { result } = renderHook(useTodoContext, { wrapper: TodoProvider })
    await waitFor(() => expect(result.current.loadError).toBe('Offline'))
    primeInitial()
    await act(async () => {
      await result.current.reload()
    })
    expect(result.current.loadError).toBe('')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.todos).toEqual(todos)
  })

  it('does not send an add request for a whitespace-only title', async () => {
    primeInitial()
    const { result } = await mountProvider()
    fetchMock.mockClear()
    await act(async () => {
      await expect(result.current.addTodo({ title: '  ', group: 'Inbox', priority: 'normal' })).resolves.toBeNull()
    })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.current.todos).toEqual(todos)
  })

  it('prepends a created todo and refreshes counts using the server response', async () => {
    primeInitial()
    const { result } = await mountProvider()
    const created = { ...todos[0], id: 'new', title: 'New task' }
    const nextGroups = groups.map((group) => (group.id === 'work' ? { ...group, todoCount: 3 } : group))
    fetchMock.mockResolvedValueOnce(jsonResponse({ todo: created, groups: nextGroups }))
    await act(async () => {
      await expect(result.current.addTodo({ title: ' New task ', group: 'Work', priority: 'high' })).resolves.toEqual(
        created,
      )
    })
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/todos',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New task', group: 'Work', priority: 'high' }),
      }),
    )
    expect(result.current.todos).toEqual([created, ...todos])
    expect(result.current.groups.find((group) => group.id === 'work')?.todoCount).toBe(3)
  })

  it.each([true, false])('uses the returned todo after setting completed to %s', async (completed) => {
    primeInitial()
    const { result } = await mountProvider()
    const updated = { ...todos[0], completed }
    fetchMock.mockResolvedValueOnce(jsonResponse({ todo: updated, groups }))
    await act(async () => {
      await result.current.toggleTodo('active', completed)
    })
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/todos/active',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ completed }) }),
    )
    expect(result.current.todos).toEqual([updated, ...todos.slice(1)])
  })

  it('updates a todo and group counts using returned data', async () => {
    primeInitial()
    const { result } = await mountProvider()
    const updated = { ...todos[0], title: 'Updated', group: 'Inbox', groupId: 'inbox', priority: 'urgent' as const }
    const nextGroups = [
      { ...groups[0], todoCount: 1 },
      { ...groups[1], todoCount: 2 },
    ]
    fetchMock.mockResolvedValueOnce(jsonResponse({ todo: updated, groups: nextGroups }))
    await act(async () => {
      await result.current.updateTodo('active', { title: 'Updated', group: 'Inbox', priority: 'urgent' })
    })
    expect(result.current.todos[0]).toEqual(updated)
    expect(result.current.groups.find((group) => group.id === 'inbox')?.todoCount).toBe(2)
  })

  it('deletes only the requested todo and refreshes counts', async () => {
    primeInitial()
    const { result } = await mountProvider()
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true, groups: [{ ...groups[0], todoCount: 1 }, groups[1]] }))
    await act(async () => {
      await result.current.deleteTodo('active')
    })
    expect(result.current.todos).toEqual(todos.slice(1))
    expect(result.current.groups.find((group) => group.id === 'work')?.todoCount).toBe(1)
  })

  it('creates and sorts a group', async () => {
    primeInitial()
    const { result } = await mountProvider()
    const group = { id: 'archive', name: 'Archive', todoCount: 0 }
    fetchMock.mockResolvedValueOnce(jsonResponse({ group }))
    await act(async () => {
      await expect(result.current.createGroup('Archive')).resolves.toEqual(group)
    })
    expect(result.current.groups.map((item) => item.name)).toEqual(['Archive', 'Inbox', 'Work'])
  })

  it('renames a group and synchronizes names on its todos', async () => {
    primeInitial()
    const { result } = await mountProvider()
    const group = { ...groups[0], name: 'Personal' }
    fetchMock.mockResolvedValueOnce(jsonResponse({ group }))
    await act(async () => {
      await result.current.renameGroup('work', 'Personal')
    })
    expect(result.current.groups).toEqual([groups[1], group])
    expect(result.current.todos).toEqual(
      todos.map((todo) => (todo.groupId === 'work' ? { ...todo, group: 'Personal' } : todo)),
    )
  })

  it('moves deleted group todos to the returned Inbox and returns the moved count', async () => {
    primeInitial()
    const { result } = await mountProvider()
    const destinationGroup = { ...groups[1], todoCount: 3 }
    fetchMock.mockResolvedValueOnce(jsonResponse({ destinationGroup, movedTodoCount: 2 }))
    await act(async () => {
      await expect(result.current.deleteGroup('work')).resolves.toBe(2)
    })
    expect(result.current.groups).toEqual([destinationGroup])
    expect(result.current.todos).toEqual(todos.map((todo) => ({ ...todo, group: 'Inbox', groupId: 'inbox' })))
  })

  it.each(['add', 'toggle', 'update', 'delete', 'create-group', 'rename-group', 'delete-group'])(
    'preserves state when %s fails',
    async (operation) => {
      primeInitial()
      const { result } = await mountProvider()
      fetchMock.mockResolvedValueOnce(jsonResponse({ message: 'Operation failed.' }, 500))
      await act(async () => {
        const request =
          operation === 'add'
            ? result.current.addTodo({ title: 'New', group: 'Work', priority: 'normal' })
            : operation === 'toggle'
              ? result.current.toggleTodo('active', true)
              : operation === 'update'
                ? result.current.updateTodo('active', { title: 'New' })
                : operation === 'delete'
                  ? result.current.deleteTodo('active')
                  : operation === 'create-group'
                    ? result.current.createGroup('New')
                    : operation === 'rename-group'
                      ? result.current.renameGroup('work', 'New')
                      : result.current.deleteGroup('work')
        await expect(request).rejects.toThrow('Operation failed.')
      })
      expect(result.current.todos).toEqual(todos)
      expect(result.current.groups).toEqual([groups[1], groups[0]])
    },
  )

  it.each([undefined, 'Work'])('clears only completed todos within scope %j', async (group) => {
    primeInitial()
    const { result } = await mountProvider()
    fetchMock.mockClear()
    fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    if (!group) fetchMock.mockResolvedValueOnce(jsonResponse({ ok: true }))
    fetchMock.mockResolvedValueOnce(jsonResponse({ groups: [] }))
    await act(async () => {
      await result.current.clearCompleted(group)
    })
    const remaining = group ? [todos[0], todos[2]] : [todos[0]]
    expect(result.current.todos).toEqual(remaining)
    expect(fetchMock).not.toHaveBeenCalledWith('/api/todos/active', expect.anything())
    if (group) expect(fetchMock).not.toHaveBeenCalledWith('/api/todos/inbox-done', expect.anything())
    expect(fetchMock).toHaveBeenLastCalledWith('/api/groups', expect.objectContaining({ credentials: 'same-origin' }))
  })

  it('reloads server state after a partially failed clearCompleted request', async () => {
    primeInitial()
    const { result } = await mountProvider()
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ ok: true }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Delete failed.' }, 500))
    const remaining = [todos[0], todos[2]]
    primeInitial(remaining, [{ ...groups[0], todoCount: 1 }, groups[1]])
    await act(async () => {
      await expect(result.current.clearCompleted()).rejects.toThrow('Delete failed.')
    })
    expect(result.current.todos).toEqual(remaining)
    expect(result.current.loadError).toBe('')
    expect(result.current.isLoading).toBe(false)
  })
})
