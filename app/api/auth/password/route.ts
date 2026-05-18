// app/api/auth/password/route.ts
import { NextResponse } from 'next/server'
import { hashPassword, validatePasswordPolicy, verifyPassword } from '@/lib/auth/password'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

type TPasswordRequestBody = {
  currentPassword?: unknown
  newPassword?: unknown
}

export async function PATCH(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as TPasswordRequestBody | null
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ message: 'Current password and new password are required.' }, { status: 400 })
  }

  const passwordError = validatePasswordPolicy(newPassword)

  if (passwordError) {
    return NextResponse.json({ message: passwordError }, { status: 400 })
  }

  if (currentPassword === newPassword) {
    return NextResponse.json({ message: 'New password must be different from current password.' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      passwordHash: true,
    },
  })

  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    return NextResponse.json({ message: 'Current password is incorrect.' }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(newPassword),
    },
  })

  return NextResponse.json({ ok: true })
}
