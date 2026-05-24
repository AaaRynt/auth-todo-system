// app/api/auth/register/route.ts
import { NextResponse } from 'next/server'
import { hashPassword, validatePasswordPolicy } from '@/lib/auth/password'
import { createSession } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type TRegisterRequestBody = {
  username?: unknown
  password?: unknown
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as TRegisterRequestBody | null
  const username = typeof body?.username === 'string' ? body.username.trim() : ''
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!username || !password) {
    return NextResponse.json({ message: 'Username and password are required.' }, { status: 400 })
  }

  const passwordError = validatePasswordPolicy(password)

  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 })
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  })

  if (existingUser) {
    return NextResponse.json({ message: 'Username already exists.' }, { status: 409 })
  }

  const user = await prisma.user.create({
    data: {
      username,
      nickname: username,
      passwordHash: await hashPassword(password),
    },
    select: {
      id: true,
      username: true,
      nickname: true,
      createdAt: true,
    },
  })

  await createSession(user.id)

  return NextResponse.json({
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
    },
  })
}
