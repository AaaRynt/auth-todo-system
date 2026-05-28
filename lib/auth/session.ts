// lib/auth/session.ts
import { cookies } from 'next/headers'
import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import type { TSessionUser } from '@/types/auth'

const sessionCookieName = 'auth-todo-session'
const sessionExpiresInMs = 1000 * 60 * 60 * 24 * 30

export async function createSession(userId: string) {
  const token = createSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = new Date(Date.now() + sessionExpiresInMs)

  await prisma.session.create({
    data: {
      tokenHash,
      expiresAt,
      userId,
    },
  })

  await setSessionCookie(token, expiresAt)
}

export async function getCurrentUser() {
  const token = await getSessionToken()

  if (!token) return null

  const tokenHash = hashSessionToken(token)
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          nickname: true,
          createdAt: true,
        },
      },
    },
  })

  if (!session) return null

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { tokenHash } }).catch(() => null)
    await clearSessionCookie()
    return null
  }

  return {
    id: session.user.id,
    username: session.user.username,
    nickname: session.user.nickname,
    createdAt: session.user.createdAt.toISOString(),
  } satisfies TSessionUser
}

export async function deleteCurrentSession() {
  const token = await getSessionToken()

  if (token) {
    await prisma.session.delete({ where: { tokenHash: hashSessionToken(token) } }).catch(() => null)
  }

  await clearSessionCookie()
}

function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('base64url')
}

async function getSessionToken() {
  const cookieStore = await cookies()

  return cookieStore.get(sessionCookieName)?.value ?? null
}

async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies()

  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

async function clearSessionCookie() {
  const cookieStore = await cookies()

  cookieStore.set(sessionCookieName, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })
}
