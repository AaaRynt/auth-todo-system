// types/auth.ts
export type TSessionUser = {
  id: string
  username: string
  nickname: string
  createdAt: string
}

export type TAuthUser = TSessionUser | null
