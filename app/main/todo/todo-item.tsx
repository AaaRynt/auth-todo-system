// app/main/todo/todo-item.tsx
import { CalendarClock, Flag } from 'lucide-react'
import { priorityOptions } from '@/app/data/const'
import { Ttodo } from '@/app/data/type'
import { DeleteTodoPopover } from '@/app/main/todo/delete-todo-popover'
import { TodoEditDialog } from '@/app/main/todo/todo-edit-dialog'
import { Badge, Checkbox, Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@/components/ui'
import { cn } from '@/lib/utils'

export function TodoItem({
  todo,
  groups,
  onToggle,
  onUpdate,
  onDelete,
}: {
  todo: Ttodo
  groups: string[]
  onToggle: (id: string, completed: boolean) => void
  onUpdate: (id: string, updates: Partial<Pick<Ttodo, 'title' | 'group' | 'priority'>>) => void
  onDelete: (id: string) => void
}) {
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
  return (
    <Item className={cn('bg-card relative items-center overflow-visible py-2', todo.completed && 'bg-muted/50')}>
      {!todo.completed && <div className="bg-primary/80 absolute -top-1 -right-1 size-3 rounded-full"></div>}
      <div className="flex flex-1 flex-row items-center gap-4">
        <Checkbox
          checked={todo.completed}
          onCheckedChange={(checked) => onToggle(todo.id, checked === true)}
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
