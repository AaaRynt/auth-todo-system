// app/main/todo/todo-page.tsx
'use client'

import { CirclePlus, Folder, ListTodo } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useId, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { defaultGroup, defaultPriority, filters } from '@/app/data/const'
import type { Tfilter, Tpriority, Ttodo } from '@/app/data/type'
import { EmptyState } from '@/app/main/todo/empty-state'
import { PrioritySelect } from '@/app/main/todo/priority-select'
import { TodoItem } from '@/app/main/todo/todo-item'
import { useTodoContext } from '@/app/main/todo/todo-provider'
import { SearchableSelect } from '@/components/features'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  FieldLabel,
  Input,
  Spinner,
} from '@/components/ui'

export function TodoPage({ groupName }: { groupName?: string }) {
  const {
    todos,
    groups,
    search,
    isLoading,
    loadError,
    reload,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
  } = useTodoContext()
  const [title, setTitle] = useState('')
  const [group, setGroup] = useState(groupName || defaultGroup)
  const [priority, setPriority] = useState<Tpriority>(defaultPriority)
  const [filter, setFilter] = useState<Tfilter>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const scopeTitle = groupName || 'All Tasks'
  const groupNames = useMemo(() => groups.map((item) => item.name), [groups])

  const groupOptions = useMemo(
    () =>
      Array.from(new Set([groupName, group, ...groupNames].filter(Boolean) as string[]))
        .sort((firstGroup, secondGroup) => firstGroup.localeCompare(secondGroup))
        .map((groupName) => ({
          value: groupName,
          label: groupName,
        })),
    [group, groupName, groupNames],
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

  const submitTodo: NonNullable<ComponentProps<'form'>['onSubmit']> = async (event) => {
    event.preventDefault()

    if (isCreating) return

    setIsCreating(true)

    try {
      const created = await addTodo({
        title,
        group: groupName || group,
        priority,
      })

      if (!created) return

      setTitle('')
      toast.success('Todo created', { position: 'top-center' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create todo.', { position: 'top-center' })
    } finally {
      setIsCreating(false)
    }
  }

  const removeTodo = async (id: string) => {
    await deleteTodo(id)
    toast.info('Todo deleted', { position: 'top-center' })
  }

  const clearScopedCompleted = async () => {
    setIsClearing(true)

    try {
      await clearCompleted(groupName)
      toast.info('Completed todos cleared', { position: 'top-center' })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to clear todos.', { position: 'top-center' })
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <TodoManager
        heading={scopeTitle}
        title={title}
        group={group}
        groupName={groupName}
        priority={priority}
        isCreating={isCreating}
        unavailable={isLoading || !!loadError}
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

      {loadError ? (
        <LoadFailure message={loadError} onRetry={reload} />
      ) : isLoading ? (
        <div className="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
          <Spinner />
          Loading todos...
        </div>
      ) : (
        <TodoList
          filter={filter}
          completedCount={completedCount}
          isClearing={isClearing}
          groups={groupNames}
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
      )}
    </div>
  )
}

function TodoManager({
  heading,
  title,
  group,
  groupName,
  priority,
  isCreating,
  unavailable,
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
  groupName?: string
  priority: Tpriority
  isCreating: boolean
  unavailable: boolean
  groupOptions: { value: string; label: string }[]
  totalCount: number
  activeCount: number
  completedCount: number
  completionRate: number
  onTitleChange: (title: string) => void
  onGroupChange: (group: string) => void
  onPriorityChange: (priority: Tpriority) => void
  onAddTodo: NonNullable<ComponentProps<'form'>['onSubmit']>
}) {
  const formId = useId()
  const titleId = `${formId}-title`
  const groupId = `${formId}-group`
  const priorityId = `${formId}-priority`

  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_18rem] lg:gap-8">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg border">
              <ListTodo aria-hidden="true" size="16" />
            </div>
            <div>
              <CardTitle className="text-xl">{heading}</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAddTodo} className="flex flex-col gap-4 md:flex-row">
            <Field className="flex-1">
              <FieldLabel htmlFor={titleId} className="sr-only">
                Todo title
              </FieldLabel>
              <Input
                id={titleId}
                name="title"
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                placeholder="Add a new task..."
                className="flex-1"
                maxLength={200}
                required
              />
            </Field>
            <div className="flex gap-2">
              {!groupName && (
                <Field className="w-36">
                  <FieldLabel htmlFor={groupId} className="sr-only">
                    Group
                  </FieldLabel>
                  <SearchableSelect
                    id={groupId}
                    value={group}
                    options={groupOptions}
                    placeholder="Group"
                    allowCustom
                    className="w-full"
                    onChange={onGroupChange}
                  />
                </Field>
              )}

              <Field className="w-24">
                <FieldLabel htmlFor={priorityId} className="sr-only">
                  Priority
                </FieldLabel>
                <PrioritySelect
                  id={priorityId}
                  name="priority"
                  className="w-full"
                  value={priority}
                  onChange={onPriorityChange}
                />
              </Field>
              <Button type="submit" disabled={unavailable || isCreating || !title.trim()}>
                <CirclePlus aria-hidden="true" />
                {isCreating ? 'Adding...' : 'Add'}
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

function LoadFailure({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  const [isRetrying, setIsRetrying] = useState(false)

  const retry = async () => {
    setIsRetrying(true)
    await onRetry()
    setIsRetrying(false)
  }

  return (
    <section className="flex items-center justify-between rounded-lg border p-4">
      <p className="text-destructive text-sm">{message}</p>
      <Button type="button" variant="outline" disabled={isRetrying} onClick={() => void retry()}>
        {isRetrying ? <Spinner /> : null}
        Retry
      </Button>
    </section>
  )
}

function TodoList({
  filter,
  completedCount,
  isClearing,
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
  isClearing: boolean
  groups: string[]
  groupedTodos: Record<string, Ttodo[]>
  search: string
  groupName?: string
  visibleCount: number
  onFilterChange: (filter: Tfilter) => void
  onClearCompleted: () => Promise<void>
  onToggle: (id: string, completed: boolean) => Promise<void>
  onUpdate: (id: string, updates: Partial<Pick<Ttodo, 'title' | 'group' | 'priority'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
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
        <Button
          type="button"
          variant="ghost"
          disabled={isClearing || completedCount === 0}
          onClick={() => void onClearCompleted()}
        >
          {isClearing ? <Spinner /> : null}
          {isClearing ? 'Clearing...' : 'Clear completed'}
        </Button>
      </div>

      {visibleCount > 0 ? (
        Object.entries(groupedTodos).map(([sectionGroupName, groupTodos]) => (
          <div key={sectionGroupName} className="space-y-3">
            {!groupName && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{groupTodos.length}</Badge>
                <Folder className="text-muted-foreground size-4" aria-hidden="true" />
                <h2 className="text-sm font-medium">{sectionGroupName}</h2>
              </div>
            )}
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
