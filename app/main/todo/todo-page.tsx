// app/main/todo/todo-page.tsx
'use client'

import { CirclePlus, Folder, ListTodo } from 'lucide-react'
import type * as React from 'react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { defaultGroup, defaultPriority, filters } from '@/app/data/const'
import type { Tfilter, Tpriority, Ttodo } from '@/app/data/type'
import { EmptyState } from '@/app/main/todo/empty-state'
import { PrioritySelect } from '@/app/main/todo/priority-select'
import { TodoItem } from '@/app/main/todo/todo-item'
import { useTodoContext } from '@/app/main/todo/todo-provider'
import { SearchableSelect } from '@/components/features'
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@/components/ui'

export function TodoPage({ groupName }: { groupName?: string }) {
  const { todos, groups, search, addTodo, toggleTodo, updateTodo, deleteTodo, clearCompleted } = useTodoContext()
  const [title, setTitle] = useState('')
  const [group, setGroup] = useState(groupName || defaultGroup)
  const [priority, setPriority] = useState<Tpriority>(defaultPriority)
  const [filter, setFilter] = useState<Tfilter>('all')
  const scopeTitle = groupName || 'All Tasks'

  const groupOptions = useMemo(
    () =>
      Array.from(new Set([groupName, group, ...groups].filter(Boolean) as string[]))
        .sort((firstGroup, secondGroup) => firstGroup.localeCompare(secondGroup))
        .map((groupName) => ({
          value: groupName,
          label: groupName,
        })),
    [group, groupName, groups],
  )
  const scopedTodos = useMemo(() => {
    if (!groupName) return todos

    return todos.filter((todo) => todo.group === groupName)
  }, [groupName, todos])
  const activeCount = useMemo(() => scopedTodos.filter((todo) => !todo.completed).length, [scopedTodos])
  const completedCount = scopedTodos.length - activeCount
  const completionRate = scopedTodos.length ? Math.round((completedCount / scopedTodos.length) * 100) : 0
  const normalizedSearch = search.trim().toLowerCase()
  const searchedTodos = useMemo(() => {
    if (!normalizedSearch) return scopedTodos

    return scopedTodos.filter((todo) => todo.title.toLowerCase().includes(normalizedSearch))
  }, [normalizedSearch, scopedTodos])
  const visibleTodos = searchedTodos.filter((todo) => {
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

  const submitTodo = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const created = addTodo({
      title,
      group,
      priority,
    })

    if (!created) return

    setTitle('')
    toast.success('Todo created', { position: 'top-center' })
  }

  const removeTodo = (id: string) => {
    deleteTodo(id)
    toast.info('Todo deleted', { position: 'top-center' })
  }

  const clearScopedCompleted = () => {
    clearCompleted(groupName)
    toast.info('Completed todos cleared', { position: 'top-center' })
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <TodoManager
        heading={scopeTitle}
        title={title}
        group={group}
        priority={priority}
        groupOptions={groupOptions}
        totalCount={scopedTodos.length}
        activeCount={activeCount}
        completedCount={completedCount}
        completionRate={completionRate}
        onTitleChange={setTitle}
        onGroupChange={setGroup}
        onPriorityChange={setPriority}
        onAddTodo={submitTodo}
      />

      <TodoList
        filter={filter}
        completedCount={completedCount}
        groups={groups}
        groupedTodos={groupedTodos}
        search={search}
        groupName={groupName}
        visibleCount={visibleTodos.length}
        onFilterChange={setFilter}
        onClearCompleted={clearScopedCompleted}
        onToggle={toggleTodo}
        onUpdate={updateTodo}
        onDelete={removeTodo}
      />
    </div>
  )
}

function TodoManager({
  heading,
  title,
  group,
  priority,
  groupOptions,
  totalCount,
  activeCount,
  completedCount,
  completionRate,
  onTitleChange,
  onGroupChange,
  onPriorityChange,
  onAddTodo,
}: {
  heading: string
  title: string
  group: string
  priority: Tpriority
  groupOptions: { value: string; label: string }[]
  totalCount: number
  activeCount: number
  completedCount: number
  completionRate: number
  onTitleChange: (title: string) => void
  onGroupChange: (group: string) => void
  onPriorityChange: (priority: Tpriority) => void
  onAddTodo: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_18rem] lg:gap-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="size-10 rounded-lg p-0">
              <ListTodo className="size-5" aria-hidden="true" />
            </Badge>
            <div>
              <CardTitle className="text-xl">{heading}</CardTitle>
              <CardDescription>Capture, track, and finish your local tasks.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAddTodo} className="flex gap-4 md:grid-cols-[1fr_10rem_9rem_auto]">
            <Input
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
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
                onChange={onGroupChange}
              />
              <PrioritySelect value={priority} onChange={onPriorityChange} />
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
          <Stat label="Total" value={totalCount} />
          <Stat label="Active" value={activeCount} />
          <Stat label="Done" value={completedCount} />
        </CardContent>
      </Card>
    </section>
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

function TodoList({
  filter,
  completedCount,
  groups,
  groupedTodos,
  search,
  groupName,
  visibleCount,
  onFilterChange,
  onClearCompleted,
  onToggle,
  onUpdate,
  onDelete,
}: {
  filter: Tfilter
  completedCount: number
  groups: string[]
  groupedTodos: Record<string, Ttodo[]>
  search: string
  groupName?: string
  visibleCount: number
  onFilterChange: (filter: Tfilter) => void
  onClearCompleted: () => void
  onToggle: (id: string, completed: boolean) => void
  onUpdate: (id: string, updates: Partial<Pick<Ttodo, 'title' | 'group' | 'priority'>>) => void
  onDelete: (id: string) => void
}) {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {filters.map((item) => (
            <Button
              key={item.value}
              type="button"
              variant={filter === item.value ? 'secondary' : 'outline'}
              onClick={() => onFilterChange(item.value)}
              className="w-24"
            >
              {item.label}
            </Button>
          ))}
        </div>
        <Button type="button" variant="ghost" disabled={completedCount === 0} onClick={onClearCompleted}>
          Clear completed
        </Button>
      </div>

      {visibleCount > 0 ? (
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
                onToggle={onToggle}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        ))
      ) : (
        <EmptyState filter={filter} search={search} groupName={groupName} />
      )}
    </section>
  )
}
