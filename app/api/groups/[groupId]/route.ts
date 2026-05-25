// app/api/groups/[groupId]/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import { defaultGroupName, groupSelect, normalizeGroupName, serializeGroup, validateGroupName } from '@/lib/todo-data'

export const runtime = 'nodejs'

type TGroupRouteContext = {
  params: Promise<{ groupId: string }>
}

type TUpdateGroupRequestBody = {
  name?: unknown
}

export async function PATCH(request: Request, { params }: TGroupRouteContext) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { groupId } = await params
  const existingGroup = await prisma.group.findFirst({
    where: {
      id: groupId,
      userId: currentUser.id,
    },
    select: groupSelect,
  })

  if (!existingGroup) {
    return NextResponse.json({ message: 'Group not found.' }, { status: 404 })
  }

  if (existingGroup.name.toLowerCase() === defaultGroupName.toLowerCase()) {
    return NextResponse.json({ message: 'Inbox cannot be renamed.' }, { status: 400 })
  }

  const body = (await request.json().catch(() => null)) as TUpdateGroupRequestBody | null
  const name = normalizeGroupName(body?.name)
  const nameError = validateGroupName(name)

  if (nameError) {
    return NextResponse.json({ message: nameError }, { status: 400 })
  }

  const conflictingGroup = await prisma.group.findFirst({
    where: {
      userId: currentUser.id,
      id: { not: groupId },
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    select: { id: true },
  })

  if (conflictingGroup) {
    return NextResponse.json({ message: 'Group already exists.' }, { status: 409 })
  }

  const group = await prisma.group.update({
    where: { id: existingGroup.id },
    data: { name },
    select: groupSelect,
  })

  return NextResponse.json({ group: serializeGroup(group) })
}

export async function DELETE(_request: Request, { params }: TGroupRouteContext) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { groupId } = await params
  const existingGroup = await prisma.group.findFirst({
    where: {
      id: groupId,
      userId: currentUser.id,
    },
    select: groupSelect,
  })

  if (!existingGroup) {
    return NextResponse.json({ message: 'Group not found.' }, { status: 404 })
  }

  if (existingGroup.name.toLowerCase() === defaultGroupName.toLowerCase()) {
    return NextResponse.json({ message: 'Inbox cannot be deleted.' }, { status: 400 })
  }

  const movedTodoCount = existingGroup._count.todos
  const inbox = await prisma.$transaction(async (tx) => {
    const existingInbox = await tx.group.findFirst({
      where: {
        userId: currentUser.id,
        name: {
          equals: defaultGroupName,
          mode: 'insensitive',
        },
      },
      select: groupSelect,
    })
    const destinationGroup =
      existingInbox ??
      (await tx.group.create({
        data: {
          userId: currentUser.id,
          name: defaultGroupName,
        },
        select: groupSelect,
      }))

    await tx.todo.updateMany({
      where: {
        groupId: existingGroup.id,
        userId: currentUser.id,
      },
      data: { groupId: destinationGroup.id },
    })

    await tx.group.delete({ where: { id: existingGroup.id } })

    return tx.group.findUniqueOrThrow({
      where: { id: destinationGroup.id },
      select: groupSelect,
    })
  })

  return NextResponse.json({
    ok: true,
    movedTodoCount,
    destinationGroup: serializeGroup(inbox),
  })
}
