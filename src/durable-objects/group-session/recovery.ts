import type { GroupSessionRequest, PrismaClient } from './types'
import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import type { BuiltPair } from '@/features/groups/lib/pairing/types'
import { persistPairing } from './pairing-actions'
import { persistResetPool } from './pool-actions'
import {
  clearPendingOperation,
  clearStoredGroupSession,
  getStoredRatings,
  getStoredTasks,
  markSessionInitialized,
  pruneRatingsToActiveTasks,
  readSessionMetadata,
  removeStoredTasks,
} from './storage'

interface PendingPairing {
  kind: 'pair'
  request: GroupSessionRequest
  pairingId: string
  pairs: BuiltPair[]
}
interface PendingReset {
  kind: 'reset'
  request: GroupSessionRequest
}

/** Finish the accepted operation before serving or changing the pool again. */
export async function recoverGroupSession(ctx: DurableObjectState, prisma: PrismaClient): Promise<GroupSessionEvent | null> {
  const serialized = readSessionMetadata(ctx, 'pending')
  if (serialized === null) {
    return null
  }
  const pending = JSON.parse(serialized) as PendingPairing | PendingReset
  try {
    if (pending.kind === 'pair') {
      await persistPairing(prisma, pending.request, getStoredTasks(ctx), getStoredRatings(ctx), pending.pairs, pending.pairingId)
      ctx.storage.transactionSync(() => {
        removeStoredTasks(ctx, pending.pairs.flatMap(pair => pair.taskIds))
        pruneRatingsToActiveTasks(ctx)
        clearPendingOperation(ctx)
      })
      return { type: 'pairing:created', pairingId: pending.pairingId }
    }
    else {
      const [group, taskCount] = await Promise.all([
        prisma.group.findUnique({ where: { id: pending.request.groupId }, select: { active_pairing_id: true } }),
        prisma.task.count({ where: { group_id: pending.request.groupId, delete_pending: { not: true } } }),
      ])
      // A committed reset needs only the local cleanup, even if its actor left.
      if (group?.active_pairing_id !== null || taskCount > 0) {
        await persistResetPool(prisma, pending.request)
      }
      ctx.storage.transactionSync(() => {
        clearStoredGroupSession(ctx)
        markSessionInitialized(ctx)
        clearPendingOperation(ctx)
      })
      return { type: 'pool:reset' }
    }
  }
  catch (error) {
    if (error instanceof Error && [
      'You are not a member in this group',
      'Only group managers can make pairs',
      'Only group managers can reset the pool',
      'The pool changed before pairs could be created. Please review the current pool and try again.',
      'This group already has an active pairing. Reset the pool before making new pairs.',
    ].includes(error.message)) {
      clearPendingOperation(ctx)
      return null
    }
    throw error
  }
}
