// lib/auth/password.ts
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const keyLength = 64

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('base64url')
  const derivedKey = (await scryptAsync(password, salt, keyLength)) as Buffer

  return `${salt}:${derivedKey.toString('base64url')}`
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [salt, storedKey] = passwordHash.split(':')

  if (!salt || !storedKey) return false

  const storedBuffer = Buffer.from(storedKey, 'base64url')
  const derivedKey = (await scryptAsync(password, salt, storedBuffer.length)) as Buffer

  return storedBuffer.length === derivedKey.length && timingSafeEqual(storedBuffer, derivedKey)
}
