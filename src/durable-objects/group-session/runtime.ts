import type { PrismaClient } from './types'
import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'

export interface GroupSessionRuntime {
  ctx: DurableObjectState
  ensureHydrated: (groupId: string, prisma?: PrismaClient) => Promise<void>
  broadcast: (event: GroupSessionEvent) => void
}
