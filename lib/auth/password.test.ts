// lib/auth/password.test.ts
import { describe, expect, it } from 'vitest'
import { hashPassword, validatePasswordPolicy, verifyPassword } from '@/lib/auth/password'

describe('validatePasswordPolicy', () => {
  it.each(['Aa1234', 'LongerPassword123', 'Aa12!@'])('accepts a valid password: %s', (password) => {
    expect(validatePasswordPolicy(password)).toBeNull()
  })

  it.each(['', 'Aa123'])('rejects a password shorter than six characters: %j', (password) => {
    expect(validatePasswordPolicy(password)).toBe('Password must be at least 6 characters.')
  })

  it.each(['abcdef1', 'ABCDEF1', 'Abcdef', '123456'])('rejects missing character classes: %s', (password) => {
    expect(validatePasswordPolicy(password)).toBe(
      'Password must include uppercase letters, lowercase letters, and numbers.',
    )
  })
})

describe('password hashing and verification', () => {
  it('verifies the original password and rejects a different password', async () => {
    const password = 'CorrectPassword123!'
    const passwordHash = await hashPassword(password)

    expect(passwordHash).not.toContain(password)
    await expect(verifyPassword(password, passwordHash)).resolves.toBe(true)
    await expect(verifyPassword('WrongPassword123!', passwordHash)).resolves.toBe(false)
  })

  it('preserves whitespace in the password', async () => {
    const passwordHash = await hashPassword(' Aa1234 ')

    await expect(verifyPassword(' Aa1234 ', passwordHash)).resolves.toBe(true)
    await expect(verifyPassword('Aa1234', passwordHash)).resolves.toBe(false)
  })

  it('uses a fresh salt each time and produces hashes that both verify', async () => {
    const password = 'SamePassword123'
    const firstHash = await hashPassword(password)
    const secondHash = await hashPassword(password)

    expect(firstHash).not.toBe(secondHash)
    expect(firstHash.split(':')[0]).not.toBe(secondHash.split(':')[0])
    await expect(verifyPassword(password, firstHash)).resolves.toBe(true)
    await expect(verifyPassword(password, secondHash)).resolves.toBe(true)
  })

  it.each(['', 'missing-separator', ':missing-salt', 'missing-key:'])(
    'rejects a hash with a missing salt or key: %j',
    async (passwordHash) => {
      await expect(verifyPassword('Aa1234', passwordHash)).resolves.toBe(false)
    },
  )
})
