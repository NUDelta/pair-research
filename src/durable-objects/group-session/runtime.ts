import type { PrismaClient } from './types'
import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'

export interface GroupSessionRuntime {
  ctx: DurableObjectState
  ensureHydrated: (groupId: string, prisma?: PrismaClient) => Promise<void>
  broadcast: (groupId: string, event: GroupSessionEvent) => Promise<void>
}

/** Notification failure must not turn a committed mutation into a failed action. */
export async function notifyGroupSession(runtime: GroupSessionRuntime, groupId: string, event: GroupSessionEvent): Promise<void> {
  try {
    await runtime.broadcast(groupId, event)
  }
  catch (error) {
    console.error('Group session notification failed:', error)
    // Reconnect snapshots reconcile clients without replaying the mutation.
    for (const socket of runtime.ctx.getWebSockets()) {
      try {
        socket.close(1011, 'Reconnect to synchronize')
      }
      catch { /* Already closed. */ }
    }
  }
}
