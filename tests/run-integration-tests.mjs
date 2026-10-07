// tests/run-integration-tests.mjs
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { closeSync, openSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { assertTestDatabaseUrl } from './test-database-url.mjs'

const projectRoot = fileURLToPath(new URL('..', import.meta.url))
const directory = await mkdtemp(join(tmpdir(), 'auth-todo-test-'))
const dataDirectory = join(directory, 'data')
const databaseName = `auth_todo_test_${randomUUID().replaceAll('-', '')}`
const binary = (name) => (process.env.POSTGRES_BIN ? join(process.env.POSTGRES_BIN, name) : name)
let activeCommand
let postgres
let postgresClosed
let postgresError
let interrupted = false

function interrupt() {
  interrupted = true
  activeCommand?.kill('SIGTERM')
}
process.on('SIGINT', interrupt)
process.on('SIGTERM', interrupt)

async function run(command, args, env = process.env) {
  if (interrupted) throw new Error('Integration test run interrupted.')
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: projectRoot, env, stdio: 'inherit' })
    activeCommand = child
    child.once('error', reject)
    child.once('close', (code) => {
      activeCommand = undefined
      if (code === 0 && !interrupted) resolve()
      else reject(new Error(`${command} failed${code === null ? '' : ` (exit ${code})`}.`))
    })
  })
}

async function allocatePort() {
  const server = createServer()
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

async function waitForPostgres(connectionString) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (interrupted || postgresError || postgres.exitCode !== null || postgres.signalCode !== null) {
      throw new Error('Temporary PostgreSQL could not start. Check the PostgreSQL binaries in PATH or POSTGRES_BIN.')
    }
    const client = new pg.Client({ connectionString, connectionTimeoutMillis: 1000 })
    try {
      await client.connect()
      return
    } catch {
      await delay(100)
    } finally {
      await client.end()
    }
  }
  throw new Error('Temporary PostgreSQL startup timed out.')
}

try {
  await run(binary('initdb'), [
    '-D',
    dataDirectory,
    '--username=postgres',
    '--auth=trust',
    '--no-locale',
    '--encoding=UTF8',
  ])
  const port = await allocatePort()
  const logFile = openSync(join(directory, 'postgres.log'), 'a')
  try {
    postgres = spawn(
      binary('postgres'),
      ['-D', dataDirectory, '-h', '127.0.0.1', '-p', String(port), '-k', directory],
      {
        cwd: projectRoot,
        stdio: ['ignore', logFile, logFile],
      },
    )
    postgres.once('error', (error) => {
      postgresError = error
    })
    postgresClosed = new Promise((resolve) => postgres.once('close', resolve))
  } finally {
    closeSync(logFile)
  }
  const adminUrl = `postgresql://postgres@127.0.0.1:${port}/postgres`
  await waitForPostgres(adminUrl)
  const client = new pg.Client({ connectionString: adminUrl })
  try {
    await client.connect()
    // The identifier is generated here and consists only of a fixed prefix and UUID hex.
    await client.query(`CREATE DATABASE "${databaseName}"`)
  } finally {
    await client.end()
  }
  const testUrl = assertTestDatabaseUrl(`postgresql://postgres@127.0.0.1:${port}/${databaseName}`)
  const env = { ...process.env, DATABASE_URL: testUrl, TEST_DATABASE_URL: testUrl }
  console.log('Applying existing migrations to the temporary PostgreSQL database...')
  await run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], env)
  await run(
    'pnpm',
    ['exec', 'vitest', 'run', '--config', 'vitest.integration.config.mts', ...process.argv.slice(2)],
    env,
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Integration test run failed.')
  process.exitCode = 1
} finally {
  process.off('SIGINT', interrupt)
  process.off('SIGTERM', interrupt)
  if (postgres && postgres.exitCode === null && postgres.signalCode === null && !postgresError) {
    postgres.kill('SIGINT')
    const stopped = await Promise.race([postgresClosed.then(() => true), delay(10000, false, { ref: false })])
    if (!stopped) {
      postgres.kill('SIGKILL')
      await postgresClosed
    }
  }
  await rm(directory, { recursive: true, force: true })
  console.log('Temporary PostgreSQL instance and test data cleaned up.')
}
