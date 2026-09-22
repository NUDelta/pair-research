import type { PrismaClient } from './types'
import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'

export interface GroupSessionRuntime {
  ctx: DurableObjectState
  ensureHydrated: (groupId: string, prisma?: PrismaClient) => Promise<void>
  broadcast: (groupId: string, event: GroupSessionEvent, prisma?: PrismaClient) => Promise<void>
}
