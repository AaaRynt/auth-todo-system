// /Users/rynt/Desktop/Code/auth-todo-system/app/main/todo/empty-state.tsx
import { ListTodo } from 'lucide-react'
import type { Tfilter } from '@/app/data/type'

export function EmptyState({ filter, search, groupName }: { filter: Tfilter; search?: string; groupName?: string }) {
  const searching = Boolean(search?.trim())
  const message = searching
    ? 'No matching tasks. Try a different title.'
    : {
        all: groupName ? 'No tasks in this group yet.' : 'No tasks yet. Add your first todo above.',
        active: 'No active tasks. Everything is done.',
        completed: 'No completed tasks yet.',
      }[filter]

  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed text-center">
      <ListTodo className="text-muted-foreground mb-3 size-8" aria-hidden="true" />
      <p className="text-sm font-medium">{message}</p>
      <p className="text-muted-foreground mt-1 text-sm">Your todos are stored locally in this browser.</p>
    </div>
  )
}
