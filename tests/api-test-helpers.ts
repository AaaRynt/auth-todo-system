// tests/api-test-helpers.ts
import { expect, vi } from 'vitest'
import { hashPassword } from '@/lib/auth/password'
import type { TSessionUser } from '@/types/auth'

export const currentUser: TSessionUser = {
  id: 'user-a',
  username: 'ryan',
  nickname: 'Ryan',
  createdAt: '2026-10-07T00:00:00.000Z',
}

export const inboxGroup = { id: 'inbox-a', name: 'Inbox', _count: { todos: 0 } }
export const workGroup = { id: 'work-a', name: 'Work', _count: { todos: 2 } }
export const todoRecord = {
  id: 'todo-a',
  title: 'Write tests',
  completed: false,
  priority: 'high',
  createdAt: new Date('2026-10-07T00:00:00.000Z'),
  updatedAt: new Date('2026-10-07T01:00:00.000Z'),
  group: { id: workGroup.id, name: workGroup.name },
}

export const sessionMock = {
  getCurrentUser: vi.fn(),
  createSession: vi.fn(),
  deleteCurrentSession: vi.fn(),
}

export const transactionMock = {
  group: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn(), findUniqueOrThrow: vi.fn() },
  todo: { updateMany: vi.fn() },
  workspace: { findMany: vi.fn(), deleteMany: vi.fn() },
  user: { delete: vi.fn() },
}

export const prismaMock = {
  user: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  todo: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
  group: { findFirst: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  workspace: { create: vi.fn(), update: vi.fn() },
  workspaceMember: { findUnique: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}

export function resetApiMocks() {
  vi.resetAllMocks()
  sessionMock.getCurrentUser.mockResolvedValue(currentUser)
  prismaMock.group.findFirst.mockResolvedValue(inboxGroup)
  prismaMock.group.findMany.mockResolvedValue([inboxGroup, workGroup])
  prismaMock.todo.findFirst.mockResolvedValue({ id: todoRecord.id })
  prismaMock.todo.findMany.mockResolvedValue([todoRecord])
  transactionMock.workspace.findMany.mockResolvedValue([])
  prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof transactionMock) => Promise<unknown>) =>
    callback(transactionMock),
  )
}

export function makeRequest(method: string, body?: unknown) {
  return new Request('http://localhost/api/test', {
    method,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
}

export function makeInvalidJsonRequest(method: string) {
  return new Request('http://localhost/api/test', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid-json',
  })
}

export async function expectJson(response: Response, status: number, body: unknown) {
  expect(response.status).toBe(status)
  expect(await response.json()).toEqual(body)
}

export function expectNoDatabaseWrites() {
  for (const mock of [
    prismaMock.user.create,
    prismaMock.user.update,
    prismaMock.user.delete,
    prismaMock.todo.create,
    prismaMock.todo.update,
    prismaMock.todo.deleteMany,
    prismaMock.group.create,
    prismaMock.group.update,
    prismaMock.group.delete,
    prismaMock.group.upsert,
    prismaMock.$transaction,
    transactionMock.group.create,
    transactionMock.group.delete,
    transactionMock.todo.updateMany,
    prismaMock.workspace.create,
    prismaMock.workspace.update,
    transactionMock.workspace.deleteMany,
    transactionMock.user.delete,
  ]) {
    expect(mock).not.toHaveBeenCalled()
  }
}

export function expectNoDatabaseCalls() {
  expectNoDatabaseWrites()
  for (const mock of [
    prismaMock.user.findUnique,
    prismaMock.todo.findMany,
    prismaMock.todo.findFirst,
    prismaMock.group.findFirst,
    prismaMock.group.findMany,
    transactionMock.group.findFirst,
    transactionMock.group.findUniqueOrThrow,
    prismaMock.workspaceMember.findUnique,
    prismaMock.workspaceMember.findMany,
    transactionMock.workspace.findMany,
  ]) {
    expect(mock).not.toHaveBeenCalled()
  }
}

export async function createAuthUser() {
  return {
    ...currentUser,
    createdAt: new Date(currentUser.createdAt),
    passwordHash: await hashPassword('CurrentPassword123'),
  }
}
