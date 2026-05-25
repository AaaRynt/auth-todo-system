// app/api/groups/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { groupSelect, listUserGroups, normalizeGroupName, serializeGroup, validateGroupName } from '@/lib/todo-data'

export const runtime = 'nodejs'

type TCreateGroupRequestBody = {
  name?: unknown
}

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  return NextResponse.json({ groups: await listUserGroups(currentUser.id) })
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as TCreateGroupRequestBody | null
  const name = normalizeGroupName(body?.name)
  const nameError = validateGroupName(name)

  if (nameError) {
    return NextResponse.json({ message: nameError }, { status: 400 })
  }

  const existingGroup = await prisma.group.findFirst({
    where: {
      userId: currentUser.id,
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    select: groupSelect,
  })

  if (existingGroup) {
    return NextResponse.json(
      { message: 'Group already exists.', group: serializeGroup(existingGroup) },
      { status: 409 },
    )
  }

  const group = await prisma.group.create({
    data: {
      userId: currentUser.id,
      name,
    },
    select: groupSelect,
  })

  return NextResponse.json({ group: serializeGroup(group) }, { status: 201 })
}
