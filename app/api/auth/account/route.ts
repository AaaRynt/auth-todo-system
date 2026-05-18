// app/api/auth/account/route.ts
import { NextResponse } from 'next/server'
import { verifyPassword } from '@/lib/auth/password'
import { deleteCurrentSession, getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type TDeleteAccountRequestBody = {
  password?: unknown
}

export async function DELETE(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as TDeleteAccountRequestBody | null
  const password = typeof body?.password === 'string' ? body.password : ''

  if (!password) {
    return NextResponse.json({ message: 'Password is required.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      passwordHash: true,
    },
  })

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ message: 'Password is incorrect.' }, { status: 401 })
  }

  await prisma.user.delete({
    where: { id: user.id },
  })
  await deleteCurrentSession()

  return NextResponse.json({ ok: true })
}
