// app/data/type.ts
export type TAuthUser = {
  id: string
  username: string
  createdAt: string
} | null
export type TGroup = {
  id: string
  name: string
  slug: string
  createdAt: number
}
export type Ttodo = {
  id: string
  title: string
  group: string
  // groupId: string
  priority: Tpriority
  completed: boolean
  createdAt: number
}
export type Tfilter = 'all' | 'active' | 'completed'
export type Tpriority = 'low' | 'normal' | 'high' | 'urgent'

//[todo] 预留 Pomodoro 番茄钟吗？
