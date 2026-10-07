// tests/frontend/test-helpers.ts
import type { TGroup, TTodo } from '@/types/todo'

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

export function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

export const groups: TGroup[] = [
  { id: 'work', name: 'Work', todoCount: 2 },
  { id: 'inbox', name: 'Inbox', todoCount: 1 },
]
export const todos: TTodo[] = [
  {
    id: 'active',
    title: 'Write tests',
    groupId: 'work',
    group: 'Work',
    priority: 'high',
    completed: false,
    createdAt: 0,
    updatedAt: '2026-10-07T00:00:00.000Z',
  },
  {
    id: 'done',
    title: 'Read docs',
    groupId: 'work',
    group: 'Work',
    priority: 'normal',
    completed: true,
    createdAt: 1,
    updatedAt: '2026-10-07T00:00:00.000Z',
  },
  {
    id: 'inbox-done',
    title: 'Buy milk',
    groupId: 'inbox',
    group: 'Inbox',
    priority: 'low',
    completed: true,
    createdAt: 2,
    updatedAt: '2026-10-07T00:00:00.000Z',
  },
]
