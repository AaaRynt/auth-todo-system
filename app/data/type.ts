// app/data/type.ts
export type Ttodo = {
  id: string
  title: string
  group: string
  priority: Tpriority
  completed: boolean
  createdAt: number
}
export type Tfilter = 'all' | 'active' | 'completed'
export type Tpriority = 'low' | 'normal' | 'high' | 'urgent'
