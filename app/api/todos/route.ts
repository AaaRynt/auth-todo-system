// app/api/todos/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'
import {
  findOrCreateGroup,
  listUserGroups,
  normalizePriority,
  normalizeTitle,
  serializeTodo,
  todoSelect,
  validateTitle,
} from '@/lib/todo-data'

export const runtime = 'nodejs'

type TCreateTodoRequestBody = {
  title?: unknown
  group?: unknown
  groupId?: unknown
  priority?: unknown
}

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const todos = await prisma.todo.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: 'desc' },
    select: todoSelect,
  })

  return NextResponse.json({ todos: todos.map(serializeTodo) })
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as TCreateTodoRequestBody | null
  const title = normalizeTitle(body?.title)
  const titleError = validateTitle(title)

  if (titleError) {
    return NextResponse.json({ message: titleError }, { status: 400 })
  }

  const priority = body?.priority === undefined ? 'normal' : normalizePriority(body.priority)

  if (!priority) {
    return NextResponse.json({ message: 'Invalid todo priority.' }, { status: 400 })
  }

  const groupResult = await getRequestedGroup(currentUser.id, body)

  if (groupResult.error || !groupResult.group) {
    return NextResponse.json({ message: groupResult.error }, { status: 400 })
  }

  const todo = await prisma.todo.create({
    data: {
      title,
      priority,
      userId: currentUser.id,
      groupId: groupResult.group.id,
    },
    select: todoSelect,
  })

  return NextResponse.json(
    {
      todo: serializeTodo(todo),
      groups: await listUserGroups(currentUser.id),
    },
    { status: 201 },
  )
}

async function getRequestedGroup(userId: string, body: TCreateTodoRequestBody | null) {
  if (body?.groupId !== undefined && typeof body.groupId !== 'string') {
    return { error: 'Invalid group id.', group: null }
  }

  if (typeof body?.groupId === 'string') {
    const group = await prisma.group.findFirst({
      where: {
        id: body.groupId,
        userId,
      },
      select: { id: true },
    })

    return group ? { error: null, group } : { error: 'Group not found.', group: null }
  }

  return findOrCreateGroup(userId, body?.group)
}
