// lib/todo-data.ts
import type { TGroup, Tpriority, Ttodo } from '@/app/data/type'
import { prisma } from '@/lib/prisma'

export const defaultGroupName = 'Inbox'
export const groupNameMaxLength = 50
export const todoTitleMaxLength = 200

const priorityValues = new Set<Tpriority>(['low', 'normal', 'high', 'urgent'])

export const todoSelect = {
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
} as const

export const groupSelect = {
  id: true,
  name: true,
  _count: {
    select: {
      todos: true,
    },
  },
} as const

type TTodoRecord = {
  id: string
  title: string
  completed: boolean
  priority: string
  createdAt: Date
  updatedAt: Date
  group: {
    id: string
    name: string
  }
}

type TGroupRecord = {
  id: string
  name: string
  _count: {
    todos: number
  }
}

export function serializeTodo(todo: TTodoRecord): Ttodo {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    priority: normalizePriority(todo.priority) ?? 'normal',
    groupId: todo.group.id,
    group: todo.group.name,
    createdAt: todo.createdAt.getTime(),
    updatedAt: todo.updatedAt.toISOString(),
  }
}

export function serializeGroup(group: TGroupRecord): TGroup {
  return {
    id: group.id,
    name: group.name,
    todoCount: group._count.todos,
  }
}

export function normalizePriority(priority: unknown) {
  if (typeof priority !== 'string') return null

  return priorityValues.has(priority as Tpriority) ? (priority as Tpriority) : null
}

export function normalizeGroupName(name: unknown) {
  if (typeof name !== 'string') return ''

  const trimmedName = name.trim()

  return trimmedName.toLowerCase() === defaultGroupName.toLowerCase() ? defaultGroupName : trimmedName
}

export function validateGroupName(name: string) {
  if (!name) return 'Group name is required.'
  if (name.length > groupNameMaxLength) return `Group name must be ${groupNameMaxLength} characters or fewer.`

  return null
}

export function normalizeTitle(title: unknown) {
  if (typeof title !== 'string') return ''

  return title.trim()
}

export function validateTitle(title: string) {
  if (!title) return 'Todo title is required.'
  if (title.length > todoTitleMaxLength) return `Todo title must be ${todoTitleMaxLength} characters or fewer.`

  return null
}

export async function ensureInboxGroup(userId: string) {
  const existingInbox = await prisma.group.findFirst({
    where: {
      userId,
      name: {
        equals: defaultGroupName,
        mode: 'insensitive',
      },
    },
    select: groupSelect,
  })

  if (existingInbox) {
    return existingInbox
  }

  return prisma.group.upsert({
    where: {
      userId_name: {
        userId,
        name: defaultGroupName,
      },
    },
    update: {},
    create: {
      userId,
      name: defaultGroupName,
    },
    select: groupSelect,
  })
}

export async function findOrCreateGroup(userId: string, requestedName: unknown) {
  const name = normalizeGroupName(requestedName) || defaultGroupName
  const error = validateGroupName(name)

  if (error) {
    return { error, group: null }
  }

  const existingGroup = await prisma.group.findFirst({
    where: {
      userId,
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    select: groupSelect,
  })

  if (existingGroup) {
    return { error: null, group: existingGroup }
  }

  const group = await prisma.group.create({
    data: {
      userId,
      name,
    },
    select: groupSelect,
  })

  return { error: null, group }
}

export async function listUserGroups(userId: string) {
  await ensureInboxGroup(userId)

  const groups = await prisma.group.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    select: groupSelect,
  })

  return groups.map(serializeGroup)
}
