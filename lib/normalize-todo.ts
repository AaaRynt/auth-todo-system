// lib/normalize-todo.ts
import { defaultGroup, defaultPriority, priorityOptions } from '@/app/data/const'
import { Tpriority, Ttodo } from '@/app/data/type'

export function normalizeTodo(todo: Partial<Ttodo>): Ttodo {
  function normalizePriority(priority: Ttodo['priority'] | undefined): Tpriority {
    return priorityOptions.find((option) => option.value === priority)?.value ?? defaultPriority
  }
  return {
    id: todo.id ?? crypto.randomUUID(),
    title: todo.title ?? 'Untitled task',
    groupId: todo.groupId ?? '',
    group: todo.group?.trim() || defaultGroup,
    priority: normalizePriority(todo.priority),
    completed: todo.completed ?? false,
    createdAt: todo.createdAt ?? Date.now(),
    updatedAt: todo.updatedAt ?? new Date().toISOString(),
  }
}
