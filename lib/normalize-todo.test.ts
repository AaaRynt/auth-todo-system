// lib/normalize-todo.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeTodo } from '@/lib/normalize-todo'
import type { TTodo } from '@/types/todo'

describe('normalizeTodo', () => {
  const now = new Date('2026-10-07T00:00:00.000Z')
  const generatedId = '00000000-0000-4000-8000-000000000001'

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(generatedId)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fills missing fields with stable defaults', () => {
    expect(normalizeTodo({})).toEqual({
      id: generatedId,
      title: 'Untitled task',
      groupId: '',
      group: 'Inbox',
      priority: 'normal',
      completed: false,
      createdAt: Date.UTC(2026, 9, 7),
      updatedAt: '2026-10-07T00:00:00.000Z',
    })
    expect(globalThis.crypto.randomUUID).toHaveBeenCalledOnce()
  })

  it('preserves a complete todo without generating a new id or mutating the input', () => {
    const todo: TTodo = {
      id: 'todo-1',
      title: 'Existing task',
      groupId: 'group-1',
      group: 'Work',
      priority: 'urgent',
      completed: true,
      createdAt: 1234,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }
    const original = { ...todo }

    expect(normalizeTodo(todo)).toEqual(original)
    expect(todo).toEqual(original)
    expect(globalThis.crypto.randomUUID).not.toHaveBeenCalled()
  })

  it('preserves false and an epoch timestamp rather than treating them as missing', () => {
    const todo = normalizeTodo({ completed: false, createdAt: 0 })

    expect(todo.completed).toBe(false)
    expect(todo.createdAt).toBe(0)
  })

  it('trims a supplied group name', () => {
    expect(normalizeTodo({ group: '  My Work  ' }).group).toBe('My Work')
  })

  it.each(['', ' \t\n '])('uses Inbox for an empty group: %j', (group) => {
    expect(normalizeTodo({ group }).group).toBe('Inbox')
  })

  it.each(['low', 'normal', 'high', 'urgent'] as const)('preserves a supported priority: %s', (priority) => {
    expect(normalizeTodo({ priority }).priority).toBe(priority)
  })

  it.each(['', 'HIGH', 'unknown'])('falls back to normal for an unsupported runtime priority: %j', (priority) => {
    expect(normalizeTodo({ priority: priority as TTodo['priority'] }).priority).toBe('normal')
  })
})
