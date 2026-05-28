// types/todo.ts
export type TGroup = {
  id: string
  name: string
  todoCount: number
}

export type TTodo = {
  id: string
  title: string
  group: string
  groupId: string
  priority: TPriority
  completed: boolean
  createdAt: number
  updatedAt: string
}

export type TFilter = 'all' | 'active' | 'completed'
export type TPriority = 'low' | 'normal' | 'high' | 'urgent'
