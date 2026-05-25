// app/api/main/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const defaultGroupName = 'Inbox'
const defaultPriority = 'normal'
const priorities = new Set(['low', 'normal', 'high', 'urgent'])

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const todos = await prisma.todo.findMany({
    where: {
      userId: currentUser.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      title: true,
      completed: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      group: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return NextResponse.json({
    todos: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
      priority: todo.priority,
      groupId: todo.group.id,
      group: todo.group.name,
      createdAt: todo.createdAt.getTime(),
      updatedAt: todo.updatedAt.toISOString(),
    })),
  })
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)

  if (!isPlainObject(body)) {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const title = typeof body.title === 'string' ? body.title.trim() : ''

  if (!title) {
    return NextResponse.json({ message: 'Todo title is required.' }, { status: 400 })
  }

  const priority = normalizePriority(body.priority)

  if (!priority) {
    return NextResponse.json({ message: 'Invalid todo priority.' }, { status: 400 })
  }

  const groupName = normalizeGroupName(body.group ?? body.groupName)

  const todo = await prisma.$transaction(async (tx) => {
    const group = await tx.group.upsert({
      where: {
        userId_name: {
          userId: currentUser.id,
          name: groupName,
        },
      },
      update: {},
      create: {
        name: groupName,
        userId: currentUser.id,
      },
      select: {
        id: true,
        name: true,
      },
    })

    return tx.todo.create({
      data: {
        title,
        priority,
        userId: currentUser.id,
        groupId: group.id,
      },
      select: {
        id: true,
        title: true,
        completed: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        group: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })
  })

  return NextResponse.json(
    {
      todo: {
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        priority: todo.priority,
        groupId: todo.group.id,
        group: todo.group.name,
        createdAt: todo.createdAt.getTime(),
        updatedAt: todo.updatedAt.toISOString(),
      },
    },
    { status: 201 },
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizePriority(priority: unknown) {
  if (priority === undefined || priority === null || priority === '') return defaultPriority
  if (typeof priority !== 'string') return null

  return priorities.has(priority) ? priority : null
}

function normalizeGroupName(group: unknown) {
  if (typeof group !== 'string') return defaultGroupName

  return group.trim() || defaultGroupName
}
