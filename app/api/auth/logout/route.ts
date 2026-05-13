// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { deleteCurrentSession } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function POST() {
  await deleteCurrentSession()

  return NextResponse.json({ ok: true })
}
