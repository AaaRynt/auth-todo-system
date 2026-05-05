// app/api/type.ts
export type todo = {
  title: string
  id: Date
  user: string
  type: 'todo' | 'doing' | 'done'
  importance: number
}
