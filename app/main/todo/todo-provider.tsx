// app/main/todo/todo-provider.tsx
'use client'

import type * as React from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { defaultGroup } from '@/app/data/const'
import type { Ttodo } from '@/app/data/type'
import { normalizeTodo } from '@/lib/normalize-todo'

const todosStorageKey = 'todos'
const groupsStorageKey = 'todo-groups'

type TtodoDraft = Pick<Ttodo, 'title' | 'group' | 'priority'>
type TtodoUpdates = Partial<Pick<Ttodo, 'title' | 'group' | 'priority'>>

type TtodoContextValue = {
  todos: Ttodo[]
  groups: string[]
  search: string
  hydrated: boolean
  setSearch: (search: string) => void
  createGroup: (group: string) => string | null
  addTodo: (todo: TtodoDraft) => boolean
  toggleTodo: (id: string, completed: boolean) => void
  updateTodo: (id: string, updates: TtodoUpdates) => void
  deleteTodo: (id: string) => void
  clearCompleted: (group?: string) => void
}

const TodoContext = createContext<TtodoContextValue | null>(null)

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Ttodo[]>([])
  const [savedGroups, setSavedGroups] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedTodos = parseStorageValue<Partial<Ttodo>[]>(todosStorageKey, [])
      const storedGroups = parseStorageValue<string[]>(groupsStorageKey, [])

      setTodos(Array.isArray(storedTodos) ? storedTodos.map(normalizeTodo) : [])
      setSavedGroups(Array.isArray(storedGroups) ? normalizeGroupList(storedGroups) : [])
      setHydrated(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    window.localStorage.setItem(todosStorageKey, JSON.stringify(todos))
  }, [hydrated, todos])

  useEffect(() => {
    if (!hydrated) return

    window.localStorage.setItem(groupsStorageKey, JSON.stringify(savedGroups))
  }, [hydrated, savedGroups])

  const groups = useMemo(() => {
    const todoGroups = todos.map((todo) => todo.group)

    return normalizeGroupList([defaultGroup, ...savedGroups, ...todoGroups])
  }, [savedGroups, todos])

  const rememberGroup = useCallback((group: string) => {
    const nextGroup = normalizeGroupName(group)

    setSavedGroups((currentGroups) => normalizeGroupList([...currentGroups, nextGroup]))

    return nextGroup
  }, [])

  const createGroup = useCallback(
    (group: string) => {
      const nextGroup = group.trim()

      if (!nextGroup) return null

      const existingGroup = groups.find((groupName) => groupName.toLowerCase() === nextGroup.toLowerCase())

      if (existingGroup) return existingGroup

      return rememberGroup(nextGroup)
    },
    [groups, rememberGroup],
  )

  const addTodo = useCallback(
    (todo: TtodoDraft) => {
      const nextTitle = todo.title.trim()

      if (!nextTitle) return false

      const nextGroup = rememberGroup(todo.group)

      setTodos((currentTodos) => [
        {
          id: crypto.randomUUID(),
          title: nextTitle,
          group: nextGroup,
          priority: todo.priority,
          completed: false,
          createdAt: Date.now(),
        },
        ...currentTodos,
      ])

      return true
    },
    [rememberGroup],
  )

  const toggleTodo = useCallback((id: string, completed: boolean) => {
    setTodos((currentTodos) => currentTodos.map((todo) => (todo.id === id ? { ...todo, completed } : todo)))
  }, [])

  const updateTodo = useCallback(
    (id: string, updates: TtodoUpdates) => {
      const nextGroup = updates.group === undefined ? undefined : rememberGroup(updates.group)

      setTodos((currentTodos) =>
        currentTodos.map((todo) =>
          todo.id === id && !todo.completed
            ? {
                ...todo,
                ...updates,
                title: updates.title?.trim() || todo.title,
                group: (nextGroup ?? todo.group) || defaultGroup,
                priority: updates.priority ?? todo.priority,
              }
            : todo,
        ),
      )
    },
    [rememberGroup],
  )

  const deleteTodo = useCallback((id: string) => {
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id))
  }, [])

  const clearCompleted = useCallback((group?: string) => {
    setTodos((currentTodos) =>
      currentTodos.filter((todo) => {
        if (!todo.completed) return true
        if (!group) return false

        return todo.group !== group
      }),
    )
  }, [])

  const value = useMemo<TtodoContextValue>(
    () => ({
      todos,
      groups,
      search,
      hydrated,
      setSearch,
      createGroup,
      addTodo,
      toggleTodo,
      updateTodo,
      deleteTodo,
      clearCompleted,
    }),
    [addTodo, clearCompleted, createGroup, deleteTodo, groups, hydrated, search, toggleTodo, todos, updateTodo],
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

function parseStorageValue<Tvalue>(key: string, fallback: Tvalue): Tvalue {
  try {
    return JSON.parse(window.localStorage.getItem(key) || JSON.stringify(fallback)) as Tvalue
  } catch {
    return fallback
  }
}

function normalizeGroupName(group: string) {
  return group.trim() || defaultGroup
}

function normalizeGroupList(groups: string[]) {
  const uniqueGroups = new Map<string, string>()

  for (const group of groups) {
    const nextGroup = group.trim()

    if (!nextGroup) continue

    const key = nextGroup.toLowerCase()

    if (!uniqueGroups.has(key)) {
      uniqueGroups.set(key, nextGroup)
    }
  }

  return Array.from(uniqueGroups.values()).sort((firstGroup, secondGroup) => firstGroup.localeCompare(secondGroup))
}
