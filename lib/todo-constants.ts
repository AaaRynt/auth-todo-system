// lib/todo-constants.ts
import type { TPriority } from '@/types/todo'

export const defaultGroupName = 'Inbox'
export const defaultPriority: TPriority = 'normal'
export const groupNameMaxLength = 50
export const todoTitleMaxLength = 200
export const todoPriorityValues: readonly TPriority[] = ['low', 'normal', 'high', 'urgent']
