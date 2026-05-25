// app/main/todo/todo-provider.tsx
'use client'

import type * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { TGroup, Ttodo } from '@/app/data/type'
import { normalizeTodo } from '@/lib/normalize-todo'

type TtodoDraft = Pick<Ttodo, 'title' | 'group' | 'priority'>
type TtodoUpdates = Partial<Pick<Ttodo, 'title' | 'group' | 'priority'>>

type TTodosResponse = {
  todos: Ttodo[]
  message?: string
}

type TTodoResponse = {
  todo: Ttodo
  groups: TGroup[]
  message?: string
}

type TGroupsResponse = {
  groups: TGroup[]
  message?: string
}

type TGroupResponse = {
  group: TGroup
  message?: string
}

type TDeleteGroupResponse = {
  destinationGroup: TGroup
  movedTodoCount: number
  message?: string
}

type TDeleteTodoResponse = {
  ok: boolean
  groups: TGroup[]
  message?: string
}

type TtodoContextValue = {
  todos: Ttodo[]
  groups: TGroup[]
  search: string
  isLoading: boolean
  loadError: string
  setSearch: (search: string) => void
  reload: () => Promise<void>
  createGroup: (name: string) => Promise<TGroup>
  renameGroup: (id: string, name: string) => Promise<TGroup>
  deleteGroup: (id: string) => Promise<number>
  addTodo: (todo: TtodoDraft) => Promise<Ttodo | null>
  toggleTodo: (id: string, completed: boolean) => Promise<void>
  updateTodo: (id: string, updates: TtodoUpdates) => Promise<void>
  deleteTodo: (id: string) => Promise<void>
  clearCompleted: (group?: string) => Promise<void>
}

const TodoContext = createContext<TtodoContextValue | null>(null)

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Ttodo[]>([])
  const [groups, setGroups] = useState<TGroup[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const reload = useCallback(async () => {
    setIsLoading(true)
    setLoadError('')

    try {
      const [todoData, groupData] = await Promise.all([
        requestJson<TTodosResponse>('/api/todos'),
        requestJson<TGroupsResponse>('/api/groups'),
      ])

      setTodos(todoData.todos.map(normalizeTodo))
      setGroups(sortGroups(groupData.groups))
    } catch (error) {
      setLoadError(getErrorMessage(error, 'Unable to load todos.'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadInitialData() {
      try {
        const [todoData, groupData] = await Promise.all([
          requestJson<TTodosResponse>('/api/todos'),
          requestJson<TGroupsResponse>('/api/groups'),
        ])

        if (cancelled) return

        setTodos(todoData.todos.map(normalizeTodo))
        setGroups(sortGroups(groupData.groups))
      } catch (error) {
        if (!cancelled) {
          setLoadError(getErrorMessage(error, 'Unable to load todos.'))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadInitialData()

    return () => {
      cancelled = true
    }
  }, [])

  const createGroup = useCallback(async (name: string) => {
    const data = await requestJson<TGroupResponse>('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })

    setGroups((currentGroups) => mergeGroup(currentGroups, data.group))

    return data.group
  }, [])

  const renameGroup = useCallback(async (id: string, name: string) => {
    const data = await requestJson<TGroupResponse>(`/api/groups/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    })

    setGroups((currentGroups) => mergeGroup(currentGroups, data.group))
    setTodos((currentTodos) =>
      currentTodos.map((todo) => (todo.groupId === data.group.id ? { ...todo, group: data.group.name } : todo)),
    )

    return data.group
  }, [])

  const deleteGroup = useCallback(async (id: string) => {
    const data = await requestJson<TDeleteGroupResponse>(`/api/groups/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })

    setGroups((currentGroups) =>
      mergeGroup(
        currentGroups.filter((group) => group.id !== id),
        data.destinationGroup,
      ),
    )
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.groupId === id
          ? {
              ...todo,
              groupId: data.destinationGroup.id,
              group: data.destinationGroup.name,
            }
          : todo,
      ),
    )

    return data.movedTodoCount
  }, [])

  const addTodo = useCallback(async (todo: TtodoDraft) => {
    const title = todo.title.trim()

    if (!title) return null

    const data = await requestJson<TTodoResponse>('/api/todos', {
      method: 'POST',
      body: JSON.stringify({
        title,
        group: todo.group,
        priority: todo.priority,
      }),
    })
    const createdTodo = normalizeTodo(data.todo)

    setTodos((currentTodos) => [createdTodo, ...currentTodos])
    setGroups(sortGroups(data.groups))

    return createdTodo
  }, [])

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    const data = await requestJson<TTodoResponse>(`/api/todos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    })

    setTodos((currentTodos) => currentTodos.map((todo) => (todo.id === data.todo.id ? normalizeTodo(data.todo) : todo)))
    setGroups(sortGroups(data.groups))
  }, [])

  const updateTodo = useCallback(async (id: string, updates: TtodoUpdates) => {
    const data = await requestJson<TTodoResponse>(`/api/todos/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })
    const updatedTodo = normalizeTodo(data.todo)

    setTodos((currentTodos) => currentTodos.map((todo) => (todo.id === updatedTodo.id ? updatedTodo : todo)))
    setGroups(sortGroups(data.groups))
  }, [])

  const deleteTodo = useCallback(async (id: string) => {
    const data = await requestJson<TDeleteTodoResponse>(`/api/todos/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })

    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id))
    setGroups(sortGroups(data.groups))
  }, [])

  const clearCompleted = useCallback(
    async (group?: string) => {
      const completedTodos = todos.filter((todo) => todo.completed && (!group || todo.group === group))

      try {
        await Promise.all(
          completedTodos.map((todo) =>
            requestJson<TDeleteTodoResponse>(`/api/todos/${encodeURIComponent(todo.id)}`, {
              method: 'DELETE',
            }),
          ),
        )

        const deletedIds = new Set(completedTodos.map((todo) => todo.id))
        const groupData = await requestJson<TGroupsResponse>('/api/groups')

        setTodos((currentTodos) => currentTodos.filter((todo) => !deletedIds.has(todo.id)))
        setGroups(sortGroups(groupData.groups))
      } catch (error) {
        await reload()
        throw error
      }
    },
    [reload, todos],
  )

  const value = useMemo<TtodoContextValue>(
    () => ({
      todos,
      groups,
      search,
      isLoading,
      loadError,
      setSearch,
      reload,
      createGroup,
      renameGroup,
      deleteGroup,
      addTodo,
      toggleTodo,
      updateTodo,
      deleteTodo,
      clearCompleted,
    }),
    [
      addTodo,
      clearCompleted,
      createGroup,
      deleteGroup,
      deleteTodo,
      groups,
      isLoading,
      loadError,
      reload,
      renameGroup,
      search,
      toggleTodo,
      todos,
      updateTodo,
    ],
  )

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>
}

export function useTodoContext() {
  const context = useContext(TodoContext)

  if (!context) {
    throw new Error('useTodoContext must be used inside TodoProvider')
  }

  return context
}

async function requestJson<Tdata extends { message?: string }>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    credentials: 'same-origin',
  })
  const data = (await response.json().catch(() => null)) as Tdata | null

  if (!response.ok) {
    throw new Error(data?.message ?? 'Request failed.')
  }

  if (!data) {
    throw new Error('Invalid server response.')
  }

  return data
}

function mergeGroup(groups: TGroup[], nextGroup: TGroup) {
  return sortGroups([...groups.filter((group) => group.id !== nextGroup.id), nextGroup])
}

function sortGroups(groups: TGroup[]) {
  return groups.sort((firstGroup, secondGroup) => firstGroup.name.localeCompare(secondGroup.name))
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}
