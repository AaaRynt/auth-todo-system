// tests/test-database-url.mjs
/** @param {string | undefined} value */
export function assertTestDatabaseUrl(value) {
  if (!value) throw new Error('Use pnpm test:integration to provision a temporary test database.')
  let url
  try {
    url = new URL(value)
  } catch {
    throw new Error('Invalid integration test database URL.')
  }
  if (
    url.protocol !== 'postgresql:' ||
    url.hostname !== '127.0.0.1' ||
    !url.port ||
    url.username !== 'postgres' ||
    url.password ||
    url.search ||
    url.hash ||
    !/^\/auth_todo_test_[a-f0-9]{32}$/.test(url.pathname)
  ) {
    throw new Error('Integration tests require a local temporary auth_todo_test database created by the test runner.')
  }
  return url.href
}
