// lib/todo-data.test.ts
import { describe, expect, it, vi } from 'vitest'
import {
  normalizeGroupName,
  normalizePriority,
  normalizeTitle,
  serializeGroup,
  serializeTodo,
  validateGroupName,
  validateTitle,
} from '@/lib/todo-data'

// Import only the pure helpers: fail immediately if a test tries to access the database.
vi.mock('@/lib/prisma', () => ({
  prisma: new Proxy(
    {},
    {
      get() {
        throw new Error('Database access is not allowed in todo-data unit tests.')
      },
    },
  ),
}))

describe('normalizePriority', () => {
  it.each(['low', 'normal', 'high', 'urgent'])('accepts the supported priority %s', (priority) => {
    expect(normalizePriority(priority)).toBe(priority)
  })

  it.each(['', 'HIGH', ' high ', 'medium', undefined, null, 1, true, {}, ['high']].map((value) => ({ value })))(
    'rejects an unsupported priority: $value',
    ({ value }) => {
      expect(normalizePriority(value)).toBeNull()
    },
  )
})

describe('group name normalization and validation', () => {
  it.each(['Inbox', 'inbox', 'INBOX', ' \tiNbOx\n '])('canonicalizes the default group: %j', (name) => {
    expect(normalizeGroupName(name)).toBe('Inbox')
  })

  it('trims surrounding whitespace and preserves other group names', () => {
    expect(normalizeGroupName(' \tMy Work\n ')).toBe('My Work')
  })

  it.each([undefined, null, 123, true, {}, ['Work']].map((value) => ({ value })))(
    'normalizes non-string input to an empty group name: $value',
    ({ value }) => {
      expect(normalizeGroupName(value)).toBe('')
    },
  )

  it.each(['', ' \t\n '])('rejects a group name that is empty after normalization: %j', (name) => {
    expect(validateGroupName(normalizeGroupName(name))).toBe('Group name is required.')
  })

  it.each(['W', 'a'.repeat(50)])('accepts a group name up to 50 characters: %s', (name) => {
    expect(validateGroupName(name)).toBeNull()
  })

  it('rejects a group name longer than 50 characters', () => {
    expect(validateGroupName('a'.repeat(51))).toBe('Group name must be 50 characters or fewer.')
  })
})

describe('title normalization and validation', () => {
  it('trims surrounding whitespace while preserving the title content', () => {
    expect(normalizeTitle(' \tWrite unit tests\n ')).toBe('Write unit tests')
  })

  it.each([undefined, null, 123, true, {}, ['Task']].map((value) => ({ value })))(
    'normalizes non-string input to an empty title: $value',
    ({ value }) => {
      expect(normalizeTitle(value)).toBe('')
    },
  )

  it.each(['', ' \t\n '])('rejects a title that is empty after normalization: %j', (title) => {
    expect(validateTitle(normalizeTitle(title))).toBe('Todo title is required.')
  })

  it.each(['T', 'a'.repeat(200)])('accepts a title up to 200 characters: %s', (title) => {
    expect(validateTitle(title)).toBeNull()
  })

  it('rejects a title longer than 200 characters', () => {
    expect(validateTitle('a'.repeat(201))).toBe('Todo title must be 200 characters or fewer.')
  })
})

describe('serializeTodo', () => {
  const todo = {
    id: 'todo-1',
    title: 'Write tests',
    completed: false,
    priority: 'high',
    createdAt: new Date('2026-10-07T00:00:00.000Z'),
    updatedAt: new Date('2026-10-07T08:30:00.000Z'),
    group: { id: 'group-1', name: 'Work' },
  }

  it('flattens the group and serializes dates for the API response', () => {
    expect(serializeTodo(todo)).toEqual({
      id: 'todo-1',
      title: 'Write tests',
      completed: false,
      priority: 'high',
      groupId: 'group-1',
      group: 'Work',
      createdAt: Date.UTC(2026, 9, 7),
      updatedAt: '2026-10-07T08:30:00.000Z',
    })
  })

  it('preserves a completed task', () => {
    expect(serializeTodo({ ...todo, completed: true }).completed).toBe(true)
  })

  it('falls back to normal for an unsupported stored priority', () => {
    expect(serializeTodo({ ...todo, priority: 'legacy-value' }).priority).toBe('normal')
  })
})

describe('serializeGroup', () => {
  it.each([0, 3])('serializes the group with a todo count of %i', (todoCount) => {
    expect(serializeGroup({ id: 'group-1', name: 'Inbox', _count: { todos: todoCount } })).toEqual({
      id: 'group-1',
      name: 'Inbox',
      todoCount,
    })
  })
})
