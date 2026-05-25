// app/data/type.ts
export type TSessionUser = {
  id: string
  username: string
  nickname: string
  createdAt: string
}
export type TAuthUser = TSessionUser | null

export type TGroup = {
  id: string
  name: string
  todoCount: number
}
export type Ttodo = {
  id: string
  title: string
  group: string
  groupId: string
  priority: Tpriority
  completed: boolean
  createdAt: number
  updatedAt: string
}
export type Tfilter = 'all' | 'active' | 'completed'
export type Tpriority = 'low' | 'normal' | 'high' | 'urgent'

//[todo] 预留 Pomodoro 番茄钟吗？
