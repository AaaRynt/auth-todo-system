// app/main/todo/page.tsx
'use client'

import { CirclePlus, Folder, ListTodo } from 'lucide-react'
import type * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { defaultGroup, defaultPriority, filters } from '@/app/data/const'
import type { Tfilter, Tpriority, Ttodo } from '@/app/data/type'
import { EmptyState, PrioritySelect, TodoItem } from '@/app/main/todo'
import { SearchableSelect } from '@/components/features/'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui/'
import { normalizeTodo } from '@/lib/normalize-todo'

export default function TodoPage() {
  const [todos, setTodos] = useState<Ttodo[]>([])
  const [title, setTitle] = useState('')
  const [group, setGroup] = useState(defaultGroup)
  const [priority, setPriority] = useState<Tpriority>(defaultPriority)
  const [filter, setFilter] = useState<Tfilter>('all')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedTodos = JSON.parse(window.localStorage.getItem('todos') || '[]') as Partial<Ttodo>[]

      setTodos(Array.isArray(storedTodos) ? storedTodos.map(normalizeTodo) : [])
      setHydrated(true)
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!hydrated) return

    window.localStorage.setItem('todos', JSON.stringify(todos))
  }, [hydrated, todos])

  const activeCount = useMemo(() => todos.filter((todo) => !todo.completed).length, [todos])
  const completedCount = todos.length - activeCount
  const completionRate = todos.length ? Math.round((completedCount / todos.length) * 100) : 0
  const groups = useMemo(() => {
    const names = todos.map((todo) => todo.group).filter(Boolean)

    return Array.from(new Set([defaultGroup, ...names])).sort((a, b) => a.localeCompare(b))
  }, [todos])
  const groupOptions = useMemo(
    () =>
      groups.map((groupName) => ({
        value: groupName,
        label: groupName,
      })),
    [groups],
  )
  const visibleTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed

    return true
  })
  const groupedTodos = visibleTodos.reduce<Record<string, Ttodo[]>>((result, todo) => {
    const key = todo.group || defaultGroup

    result[key] = result[key] ?? []
    result[key].push(todo)

    return result
  }, {})

  const addTodo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextTitle = title.trim()

    if (!nextTitle) return

    setTodos((currentTodos) => [
      {
        id: crypto.randomUUID(),
        title: nextTitle,
        group: group.trim() || defaultGroup,
        priority,
        completed: false,
        createdAt: Date.now(),
      },
      ...currentTodos,
    ])
    setTitle('')
    toast.success('Todo created', { position: 'top-center' })
  }

  const toggleTodo = (id: string, completed: boolean) => {
    setTodos((currentTodos) => currentTodos.map((todo) => (todo.id === id ? { ...todo, completed } : todo)))
  }

  const updateTodo = (id: string, updates: Partial<Pick<Ttodo, 'title' | 'group' | 'priority'>>) => {
    setTodos((currentTodos) =>
      currentTodos.map((todo) =>
        todo.id === id && !todo.completed
          ? {
              ...todo,
              ...updates,
              title: updates.title?.trim() || todo.title,
              group: updates.group?.trim() || todo.group || defaultGroup,
              priority: updates.priority ?? todo.priority,
            }
          : todo,
      ),
    )
  }

  const deleteTodo = (id: string) => {
    setTodos((currentTodos) => currentTodos.filter((todo) => todo.id !== id))
    toast.info('Todo deleted', { position: 'top-center' })
  }

  const clearCompleted = () => {
    setTodos((currentTodos) => currentTodos.filter((todo) => !todo.completed))
    toast.info('Completed todos cleared', { position: 'top-center' })
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <section className="grid gap-4 lg:grid-cols-[1fr_18rem] lg:gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="size-10 rounded-lg p-0">
                <ListTodo className="size-5" aria-hidden="true" />
              </Badge>
              <div>
                <CardTitle className="text-xl">Todo Manager</CardTitle>
                <CardDescription>Capture, track, and finish your local tasks.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={addTodo} className="flex gap-4 md:grid-cols-[1fr_10rem_9rem_auto]">
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Add a new task..."
                aria-label="Todo title"
                className="flex-1"
              />
              <div className="flex gap-2">
                <SearchableSelect
                  value={group}
                  options={groupOptions}
                  placeholder="Group"
                  allowCustom
                  onChange={setGroup}
                />
                <PrioritySelect value={priority} onChange={setPriority} />
                <Button type="submit" disabled={!title.trim()}>
                  <CirclePlus aria-hidden="true" />
                  Add
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Progress</CardTitle>
            <CardDescription>{completionRate}% completed</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center">
            <Stat label="Total" value={todos.length} />
            <Stat label="Active" value={activeCount} />
            <Stat label="Done" value={completedCount} />
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-4">
            {filters.map((item) => (
              <Button
                key={item.value}
                type="button"
                variant={filter === item.value ? 'secondary' : 'outline'}
                onClick={() => setFilter(item.value)}
                className="w-24"
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Button type="button" variant="ghost" disabled={completedCount === 0} onClick={clearCompleted}>
            Clear completed
          </Button>
        </div>
        {visibleTodos.length > 0 ? (
          Object.entries(groupedTodos).map(([groupName, groupTodos]) => (
            <div key={groupName} className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{groupTodos.length}</Badge>
                <Folder className="text-muted-foreground size-4" aria-hidden="true" />
                <h2 className="text-sm font-medium">{groupName}</h2>
              </div>
              {groupTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  groups={groups}
                  onToggle={toggleTodo}
                  onUpdate={updateTodo}
                  onDelete={deleteTodo}
                />
              ))}
            </div>
          ))
        ) : (
          <EmptyState filter={filter} />
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-background rounded-lg border p-3">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  )
}
