// app/api/groups/route.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET, POST } from '@/app/api/groups/route'
import { serializeGroup } from '@/lib/todo-data'
import {
  currentUser,
  expectJson,
  expectNoDatabaseCalls,
  expectNoDatabaseWrites,
  inboxGroup,
  makeInvalidJsonRequest,
  makeRequest,
  prismaMock,
  resetApiMocks,
  sessionMock,
  workGroup,
} from '@/tests/api-test-helpers'

vi.mock('@/lib/prisma', async () => ({ prisma: (await import('@/tests/api-test-helpers')).prismaMock }))
vi.mock('@/lib/auth/session', async () => (await import('@/tests/api-test-helpers')).sessionMock)

beforeEach(resetApiMocks)

describe('/api/groups', () => {
  it.each(['GET', 'POST'])('requires a login for %s', async (method) => {
    sessionMock.getCurrentUser.mockResolvedValue(null)
    await expectJson(method === 'GET' ? await GET() : await POST(makeRequest('POST', { name: 'Work' })), 401, {
      message: 'Unauthorized.',
    })
    expectNoDatabaseCalls()
  })

  it('lists only the current user’s groups and their counts', async () => {
    await expectJson(await GET(), 200, { groups: [inboxGroup, workGroup].map(serializeGroup) })
    expect(prismaMock.group.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: currentUser.id, name: { equals: 'Inbox', mode: 'insensitive' } },
      }),
    )
    expect(prismaMock.group.findMany).toHaveBeenCalledWith({
      where: { userId: currentUser.id },
      orderBy: { name: 'asc' },
      select: expect.any(Object),
    })
    expectNoDatabaseWrites()
  })

  it('ensures a new user has their own Inbox', async () => {
    prismaMock.group.findFirst.mockResolvedValue(null)
    prismaMock.group.upsert.mockResolvedValue(inboxGroup)
    prismaMock.group.findMany.mockResolvedValue([inboxGroup])
    await expectJson(await GET(), 200, { groups: [serializeGroup(inboxGroup)] })
    expect(prismaMock.group.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_name: { userId: currentUser.id, name: 'Inbox' } },
        create: { userId: currentUser.id, name: 'Inbox' },
        update: {},
      }),
    )
  })

  it.each([{}, { name: '' }, { name: ' \t ' }, { name: 123 }, { name: 'a'.repeat(51) }])(
    'rejects an invalid group name without writing: %j',
    async (body) => {
      expect((await POST(makeRequest('POST', body))).status).toBe(400)
      expectNoDatabaseCalls()
    },
  )

  it('rejects invalid JSON without writing', async () => {
    await expectJson(await POST(makeInvalidJsonRequest('POST')), 400, { message: 'Group name is required.' })
    expectNoDatabaseCalls()
  })

  it.each(['work', 'WORK', ' Work '])(
    'checks case-insensitive duplicates within the current user: %j',
    async (name) => {
      prismaMock.group.findFirst.mockResolvedValue(workGroup)
      await expectJson(await POST(makeRequest('POST', { name })), 409, {
        message: 'Group already exists.',
        group: serializeGroup(workGroup),
      })
      expect(prismaMock.group.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: currentUser.id, name: { equals: name.trim(), mode: 'insensitive' } },
        }),
      )
      expectNoDatabaseWrites()
    },
  )

  it('creates a trimmed group owned by the current user, ignoring a supplied userId', async () => {
    prismaMock.group.findFirst.mockResolvedValue(null)
    prismaMock.group.create.mockResolvedValue(workGroup)
    await expectJson(await POST(makeRequest('POST', { name: ' Work ', userId: 'user-b' })), 201, {
      group: serializeGroup(workGroup),
    })
    expect(prismaMock.group.create).toHaveBeenCalledWith({
      data: { userId: currentUser.id, name: 'Work' },
      select: expect.any(Object),
    })
  })

  it('canonicalizes the Inbox name before checking and creating', async () => {
    prismaMock.group.findFirst.mockResolvedValue(null)
    prismaMock.group.create.mockResolvedValue(inboxGroup)
    await expectJson(await POST(makeRequest('POST', { name: ' inbox ' })), 201, { group: serializeGroup(inboxGroup) })
    expect(prismaMock.group.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: currentUser.id, name: 'Inbox' },
      }),
    )
  })
})
