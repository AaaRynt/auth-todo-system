// lib/normalize-todo.ts
import { defaultGroupName, defaultPriority, todoPriorityValues } from '@/lib/todo-constants'
import type { TPriority, TTodo } from '@/types/todo'

export function normalizeTodo(todo: Partial<TTodo>): TTodo {
  function normalizePriority(priority: TTodo['priority'] | undefined): TPriority {
    return todoPriorityValues.includes(priority as TPriority) ? (priority as TPriority) : defaultPriority
  }
  return {
    id: todo.id ?? crypto.randomUUID(),
    title: todo.title ?? 'Untitled task',
    groupId: todo.groupId ?? '',
    group: todo.group?.trim() || defaultGroupName,
    priority: normalizePriority(todo.priority),
    completed: todo.completed ?? false,
    createdAt: todo.createdAt ?? Date.now(),
    updatedAt: todo.updatedAt ?? new Date().toISOString(),
  }
}
