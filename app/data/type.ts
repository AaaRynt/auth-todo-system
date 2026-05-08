// app/data/type.ts
export type Todo = {
  id: string
  title: string
  group: string
  priority: Priority
  completed: boolean
  createdAt: number
}
export type Filter = 'all' | 'active' | 'completed'
export type Priority = 'low' | 'normal' | 'high' | 'urgent'
