// lib/auth/profile.ts
export const nicknameMaxLength = 24

export function normalizeNickname(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateNickname(nickname: string) {
  if (!nickname) {
    return 'Nickname is required.'
  }

  if (nickname.length > nicknameMaxLength) {
    return `Nickname must be ${nicknameMaxLength} characters or fewer.`
  }

  return ''
}
