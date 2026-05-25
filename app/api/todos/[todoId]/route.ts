// app/api/todos/[todoId]/route.ts
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

type TTodoRouteContext = {
  params: Promise<{ todoId: string }>
}

type TUpdateTodoRequestBody = {
  title?: unknown
  completed?: unknown
  priority?: unknown
  group?: unknown
  groupId?: unknown
}

export async function PATCH(request: Request, { params }: TTodoRouteContext) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { todoId } = await params
  const existingTodo = await prisma.todo.findFirst({
    where: {
      id: todoId,
      userId: currentUser.id,
    },
    select: { id: true },
  })

  if (!existingTodo) {
    return NextResponse.json({ message: 'Todo not found.' }, { status: 404 })
  }

  const body = (await request.json().catch(() => null)) as TUpdateTodoRequestBody | null

  if (!body || !hasTodoUpdates(body)) {
    return NextResponse.json({ message: 'Nothing to update.' }, { status: 400 })
  }

  const data: {
    title?: string
    completed?: boolean
    priority?: string
    groupId?: string
  } = {}

  if (body.title !== undefined) {
    const title = normalizeTitle(body.title)
    const titleError = validateTitle(title)

    if (titleError) {
      return NextResponse.json({ message: titleError }, { status: 400 })
    }

    data.title = title
  }

  if (body.completed !== undefined) {
    if (typeof body.completed !== 'boolean') {
      return NextResponse.json({ message: 'Invalid completed value.' }, { status: 400 })
    }

    data.completed = body.completed
  }

  if (body.priority !== undefined) {
    const priority = normalizePriority(body.priority)

    if (!priority) {
      return NextResponse.json({ message: 'Invalid todo priority.' }, { status: 400 })
    }

    data.priority = priority
  }

  if (body.groupId !== undefined || body.group !== undefined) {
    const groupResult = await getRequestedGroup(currentUser.id, body)

    if (groupResult.error || !groupResult.group) {
      return NextResponse.json({ message: groupResult.error }, { status: 400 })
    }

    data.groupId = groupResult.group.id
  }

  const todo = await prisma.todo.update({
    where: { id: existingTodo.id },
    data,
    select: todoSelect,
  })

  return NextResponse.json({
    todo: serializeTodo(todo),
    groups: await listUserGroups(currentUser.id),
  })
}

export async function DELETE(_request: Request, { params }: TTodoRouteContext) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const { todoId } = await params
  const result = await prisma.todo.deleteMany({
    where: {
      id: todoId,
      userId: currentUser.id,
    },
  })

  if (result.count === 0) {
    return NextResponse.json({ message: 'Todo not found.' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    groups: await listUserGroups(currentUser.id),
  })
}

function hasTodoUpdates(body: TUpdateTodoRequestBody) {
  return (
    body.title !== undefined ||
    body.completed !== undefined ||
    body.priority !== undefined ||
    body.group !== undefined ||
    body.groupId !== undefined
  )
}

async function getRequestedGroup(userId: string, body: TUpdateTodoRequestBody) {
  if (body.groupId !== undefined && typeof body.groupId !== 'string') {
    return { error: 'Invalid group id.', group: null }
  }

  if (typeof body.groupId === 'string') {
    const group = await prisma.group.findFirst({
      where: {
        id: body.groupId,
        userId,
      },
      select: { id: true },
    })

    return group ? { error: null, group } : { error: 'Group not found.', group: null }
  }

  return findOrCreateGroup(userId, body.group)
}
