// lib/auth/profile.test.ts
import { describe, expect, it } from 'vitest'
import { normalizeNickname, validateNickname } from '@/lib/auth/profile'

describe('normalizeNickname', () => {
  it('trims surrounding whitespace while preserving internal spaces and case', () => {
    expect(normalizeNickname(' \tRyan Todo\n ')).toBe('Ryan Todo')
  })

  it('normalizes whitespace-only input to an empty string', () => {
    expect(normalizeNickname(' \t\n ')).toBe('')
  })

  it.each([undefined, null, 123, true, {}, ['Ryan']].map((value) => ({ value })))(
    'normalizes non-string input to an empty string: $value',
    ({ value }) => {
      expect(normalizeNickname(value)).toBe('')
    },
  )
})

describe('validateNickname', () => {
  it('rejects an empty nickname', () => {
    expect(validateNickname('')).toBe('Nickname is required.')
  })

  it('rejects a nickname that becomes empty after normalization', () => {
    expect(validateNickname(normalizeNickname(' \t '))).toBe('Nickname is required.')
  })

  it.each(['R', '任务用户', 'a'.repeat(24)])('accepts a nonempty nickname up to 24 characters: %s', (nickname) => {
    expect(validateNickname(nickname)).toBe('')
  })

  it('rejects a nickname longer than 24 characters', () => {
    expect(validateNickname('a'.repeat(25))).toBe('Nickname must be 24 characters or fewer.')
  })
})
