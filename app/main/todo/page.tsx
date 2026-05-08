// app/main/todo/page.tsx
'use client'

import { CalendarClock, CirclePlus, Flag, Folder, ListTodo } from 'lucide-react'
import type * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { defaultPriority, filters, priorityOptions } from '@/app/data/const'
import type { Filter, Priority, Todo } from '@/app/data/type'
import { DeleteTodoPopover } from '@/components/features/delete-todo-popover'
import { PrioritySelect } from '@/components/features/priority-select'
import { SearchableSelect } from '@/components/features/searchable-select'
import { TodoEditDialog } from '@/components/features/todo-edit-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item'
import { cn } from '@/lib/utils'

const defaultGroup = 'Inbox'

function normalizePriority(priority: Todo['priority'] | undefined): Priority {
  return priorityOptions.find((option) => option.value === priority)?.value ?? defaultPriority
}

function normalizeTodo(todo: Partial<Todo>): Todo {
  return {
    id: todo.id ?? crypto.randomUUID(),
    title: todo.title ?? 'Untitled task',
    group: todo.group?.trim() || defaultGroup,
    priority: normalizePriority(todo.priority),
    completed: todo.completed ?? false,
    createdAt: todo.createdAt ?? Date.now(),
  }
}

function formatCreatedAt(timestamp: number) {
  const date = new Date(timestamp)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${month}/${day}, ${hours}:${minutes}`
}

export default function TodoPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [group, setGroup] = useState(defaultGroup)
  const [priority, setPriority] = useState<Priority>(defaultPriority)
  const [filter, setFilter] = useState<Filter>('all')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedTodos = JSON.parse(window.localStorage.getItem('todos') || '[]') as Partial<Todo>[]

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
  const groupedTodos = visibleTodos.reduce<Record<string, Todo[]>>((result, todo) => {
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

  const updateTodo = (id: string, updates: Partial<Pick<Todo, 'title' | 'group' | 'priority'>>) => {
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
      <section className="grid gap-4 lg:grid-cols-[1fr_18rem]">
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

      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {filters.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={filter === item.value ? 'secondary' : 'outline'}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" disabled={completedCount === 0} onClick={clearCompleted}>
          Clear completed
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        {visibleTodos.length > 0 ? (
          Object.entries(groupedTodos).map(([groupName, groupTodos]) => (
            <div key={groupName} className="space-y-3">
              <div className="flex items-center gap-2">
                <Folder className="text-muted-foreground size-4" aria-hidden="true" />
                <h2 className="text-sm font-medium">{groupName}</h2>
                <Badge variant="secondary">{groupTodos.length}</Badge>
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

function TodoItem({
  todo,
  groups,
  onToggle,
  onUpdate,
  onDelete,
}: {
  todo: Todo
  groups: string[]
  onToggle: (id: string, completed: boolean) => void
  onUpdate: (id: string, updates: Partial<Pick<Todo, 'title' | 'group' | 'priority'>>) => void
  onDelete: (id: string) => void
}) {
  const priority = priorityOptions.find((option) => option.value === todo.priority) ?? priorityOptions[1]

  return (
    <Item className={cn('bg-card relative items-center overflow-visible py-2', todo.completed && 'bg-muted/30')}>
      {!todo.completed && <div className="bg-primary/80 absolute -top-1 -right-1 size-3 rounded-full"></div>}
      <div className="flex flex-1 flex-row items-center gap-4">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={(checked) => onToggle(todo.id, checked === true)}
          aria-label={`Mark ${todo.title} as ${todo.completed ? 'active' : 'completed'}`}
        />
        <ItemContent className="flex min-w-0 flex-col gap-1">
          <ItemTitle
            className={cn('truncate text-lg font-medium', todo.completed && 'text-muted-foreground line-through')}
          >
            {todo.title}
          </ItemTitle>
          <ItemDescription className="text-muted-foreground flex items-center gap-1 text-sm">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {formatCreatedAt(todo.createdAt)}
          </ItemDescription>
        </ItemContent>
      </div>
      <div className="flex flex-row gap-1">
        <Badge variant="outline" className="gap-1">
          <Folder aria-hidden="true" />
          {todo.group}
        </Badge>
        <Badge variant="outline" className={cn('gap-1', priority.className)}>
          <Flag aria-hidden="true" />
          {priority.label}
        </Badge>
      </div>
      <ItemActions className="flex flex-row gap-1">
        <TodoEditDialog todo={todo} groups={groups} onUpdate={onUpdate} />
        <DeleteTodoPopover todo={todo} onDelete={onDelete} />
      </ItemActions>
    </Item>
  )
}

function EmptyState({ filter }: { filter: Filter }) {
  const message =
    filter === 'completed'
      ? 'No completed tasks yet.'
      : filter === 'active'
        ? 'No active tasks. Everything is done.'
        : 'No tasks yet. Add your first todo above.'

  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed text-center">
      <ListTodo className="text-muted-foreground mb-3 size-8" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-muted-foreground mt-1 text-sm">Your todos are stored locally in this browser.</p>
    </div>
  )
}
