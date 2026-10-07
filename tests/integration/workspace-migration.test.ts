// tests/integration/workspace-migration.test.ts
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import pg from 'pg'
import { expect, it } from 'vitest'
import { assertTestDatabaseUrl } from '@/tests/test-database-url.mjs'

it('upgrades a populated legacy schema without changing accounts, sessions, groups or todos', async () => {
  const client = new pg.Client({ connectionString: assertTestDatabaseUrl(process.env.TEST_DATABASE_URL) })
  const schemaName = `legacy_${randomUUID().replaceAll('-', '')}`
  await client.connect()
  try {
    // Only the random schema identifier is interpolated; all fixture values are parameters.
    await client.query(`CREATE SCHEMA "${schemaName}"`)
    await client.query(`SET search_path TO "${schemaName}"`)
    for (const migration of [
      '20260512170000-init-auth',
      '20260519000000-add-user-nickname',
      '20260524141948_add_todo_models',
    ]) {
      await client.query(await readFile(resolve('prisma/migrations', migration, 'migration.sql'), 'utf8'))
    }
    await client.query(
      'INSERT INTO "User" ("id", "username", "nickname", "passwordHash", "updatedAt") VALUES ($1, $2, $3, $4, NOW()), ($5, $6, $7, $8, NOW())',
      ['old-a', 'legacy-a', 'Legacy A', 'keep-hash-a', 'old-b', 'legacy-b', 'Legacy B', 'keep-hash-b'],
    )
    await client.query(
      'INSERT INTO "Session" ("id", "tokenHash", "expiresAt", "userId") VALUES ($1, $2, NOW() + INTERVAL \'1 day\', $3)',
      ['old-session', 'keep-token-hash', 'old-a'],
    )
    await client.query('INSERT INTO "Group" ("id", "name", "userId", "updatedAt") VALUES ($1, $2, $3, NOW())', [
      'old-group',
      'Work',
      'old-a',
    ])
    await client.query(
      'INSERT INTO "Todo" ("id", "title", "userId", "groupId", "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
      ['old-todo', 'Keep my task', 'old-a', 'old-group'],
    )

    const tables = ['User', 'Session', 'Group', 'Todo'] as const
    const before = []
    for (const table of tables) {
      before.push(await client.query(`SELECT * FROM "${table}" ORDER BY "id"`))
    }
    await client.query(
      await readFile(resolve('prisma/migrations/20261007000000-add-workspace-foundation/migration.sql'), 'utf8'),
    )
    for (const [index, table] of tables.entries()) {
      expect((await client.query(`SELECT * FROM "${table}" ORDER BY "id"`)).rows).toEqual(before[index].rows)
    }
    const result = await client.query(
      'SELECT m."userId", m."role", m."isDefault", w."name" FROM "WorkspaceMember" m JOIN "Workspace" w ON w."id" = m."workspaceId" ORDER BY m."userId"',
    )
    expect(result.rows).toEqual([
      { userId: 'old-a', role: 'OWNER', isDefault: true, name: 'Personal' },
      { userId: 'old-b', role: 'OWNER', isDefault: true, name: 'Personal' },
    ])
    expect((await client.query('SELECT COUNT(*)::int AS count FROM "Workspace"')).rows[0].count).toBe(2)
  } finally {
    await client.query('ROLLBACK')
    await client.query('SET search_path TO public')
    await client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`)
    await client.end()
  }
})
