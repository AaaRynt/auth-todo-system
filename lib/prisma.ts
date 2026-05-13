// lib/prisma.ts
import { PrismaClient } from '@/lib/generated/prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured.')
  }

  if (!databaseUrl.startsWith('prisma+postgres://')) {
    throw new Error('Current Prisma setup expects a prisma+postgres:// DATABASE_URL.')
  }

  return new PrismaClient({
    accelerateUrl: databaseUrl,
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
