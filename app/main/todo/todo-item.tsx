// app/main/todo/todo-item.tsx
// app/main/todo/todo-item.tsx
'use client'

import { CalendarClock, Flag } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DeleteTodoPopover } from '@/app/main/todo/delete-todo-popover'
import { TodoEditDialog } from '@/app/main/todo/todo-edit-dialog'
import { priorityOptions } from '@/app/main/todo/todo-options'
import { Badge, Checkbox, Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { TTodo } from '@/types/todo'

export function TodoItem({
  todo,
  groups,
  onToggle,
  onUpdate,
  onDelete,
}: {
  todo: TTodo
  groups: string[]
  onToggle: (id: string, completed: boolean) => Promise<void>
  onUpdate: (id: string, updates: Partial<Pick<TTodo, 'title' | 'group' | 'priority'>>) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [isToggling, setIsToggling] = useState(false)
  const priority = priorityOptions.find((option) => option.value === todo.priority) ?? priorityOptions[1]
  const formatCreatedAt = (timestamp: number) => {
    const date = new Date(timestamp)
    const M = date.getMonth() + 1
    const D = date.getDate()
    const ddd = new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date)
    const HH = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')

    return `${M}/${D} ${ddd}, ${HH}:${mm}`
  }
  const toggle = async (completed: boolean) => {
    setIsToggling(true)

    try {
      await onToggle(todo.id, completed)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update todo.', { position: 'top-center' })
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <Item className={cn('bg-card relative items-center overflow-visible py-2', todo.completed && 'bg-muted/50')}>
      {!todo.completed && <div className="bg-primary/80 absolute -top-1 -right-1 size-3 rounded-full"></div>}
      <div className="flex flex-1 flex-row items-center gap-4">
        <Checkbox
          checked={todo.completed}
          disabled={isToggling}
          onCheckedChange={(checked) => void toggle(checked === true)}
          aria-label={`Mark ${todo.title} as ${todo.completed ? 'active' : 'completed'}`}
        />
        <ItemContent className="flex flex-row justify-between">
          <ItemTitle
            className={cn('truncate text-lg font-medium', todo.completed && 'text-muted-foreground line-through')}
          >
            {todo.title}
          </ItemTitle>
          <ItemDescription className="text-muted-foreground flex items-center gap-1 font-mono text-sm">
            <CalendarClock className="size-3.5" aria-hidden="true" />
            {formatCreatedAt(todo.createdAt)}
          </ItemDescription>
        </ItemContent>
      </div>
      <div className="flex flex-row gap-1">
        <Badge variant="outline" className={cn('gap-1', priority.className)}>
          <Flag aria-hidden="true" />
          {priority.label}
        </Badge>
      </div>
      <ItemActions className="flex flex-row gap-1">
        {todo.completed ? (
          <div className="size-8"></div>
        ) : (
          <TodoEditDialog todo={todo} groups={groups} onUpdate={onUpdate} />
        )}
        <DeleteTodoPopover todo={todo} onDelete={onDelete} />
      </ItemActions>
    </Item>
  )
}
