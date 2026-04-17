import { PrismaPg } from '@prisma/adapter-pg'
import { getRequiredServerEnv } from '@/shared/server/env.server'
import { PrismaClient } from '../../../prisma/generated/client/client'
import '@tanstack/react-start/server-only'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }
const isCloudflareWorkerRuntime = typeof navigator === 'object'
  && navigator !== null
  && navigator.userAgent === 'Cloudflare-Workers'

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg(getRequiredServerEnv('DATABASE_URL', 'DATABASE_URL is required to initialize Prisma Client')),
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn'] : ['error'],
  })
}

export function getPrismaClient(): PrismaClient {
  if (isCloudflareWorkerRuntime) {
    return createPrismaClient()
  }

  globalForPrisma.prisma ??= createPrismaClient()
  return globalForPrisma.prisma
}
