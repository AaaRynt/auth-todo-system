// app/api/auth/login/route.ts
import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type TLoginRequestBody = {
  username?: unknown
  password?: unknown
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as TLoginRequestBody | null
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!username || !password) {
    return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { username },
  })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ message: 'Invalid username or password.' }, { status: 401 })
  }

  await createSession(user.id)

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      createdAt: user.createdAt.toISOString(),
    },
  })
}
