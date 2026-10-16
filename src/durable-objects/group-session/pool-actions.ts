import type { GroupSessionRuntime } from './runtime'
import type { GroupSessionRequest, PrismaClient } from './types'
import { hasGroupManagementAccess } from '@/features/groups/lib/groupPermissions'
import { getMembership, getPrisma } from './database'
import { notifyGroupSession } from './runtime'
import { clearPendingOperation, clearStoredGroupSession, markSessionInitialized, writeSessionMetadata } from './storage'

const RESET_POOL_MANAGER_REQUIRED_MESSAGE = 'Only group managers can reset the pool'

export async function handleResetPool(
  runtime: GroupSessionRuntime,
  request: GroupSessionRequest,
): Promise<ActionResponse> {
  try {
    const prisma = await getPrisma()
    const membership = await getMembership(prisma, request.groupId, request.userId)

    if (membership === null) {
      return {
        success: false,
        message: 'You are not a member in this group',
      }
    }

    if (!hasGroupManagementAccess(membership.permission)) {
      return {
        success: false,
        message: RESET_POOL_MANAGER_REQUIRED_MESSAGE,
      }
    }

    await runtime.ensureHydrated(request.groupId, prisma)
    writeSessionMetadata(runtime.ctx, 'pending', JSON.stringify({ kind: 'reset', request }))
    await persistResetPool(prisma, request)

    runtime.ctx.storage.transactionSync(() => {
      clearStoredGroupSession(runtime.ctx)
      markSessionInitialized(runtime.ctx)
      clearPendingOperation(runtime.ctx)
    })
    await notifyGroupSession(runtime, request.groupId, { type: 'pool:reset' })

    return {
      success: true,
      message: 'Pool reset successfully',
    }
  }
  catch (error) {
    if (
      error instanceof Error
      && (error.message === 'You are not a member in this group' || error.message === RESET_POOL_MANAGER_REQUIRED_MESSAGE)
    ) {
      clearPendingOperation(runtime.ctx)
      return { success: false, message: error.message }
    }

    console.error('Error resetting pool through group session:', error)
    return {
      success: false,
      message: 'Failed to reset the pool',
    }
  }
}

/** Reset is replayable while the DO queue holds subsequent pool edits. */
export async function persistResetPool(prisma: PrismaClient, request: GroupSessionRequest) {
  const activeTasks = await prisma.task.findMany({
    where: {
      group_id: request.groupId,
      delete_pending: {
        not: true,
      },
    },
    select: {
      id: true,
    },
  })
  const activeTaskIds = activeTasks.map(task => task.id)

  return prisma.$transaction(async (tx) => {
    const currentMembership = await tx.group_member.findFirst({
      where: {
        group_id: request.groupId,
        user_id: request.userId,
        is_pending: false,
      },
      select: {
        permission: true,
      },
    })

    if (currentMembership === null) {
      throw new Error('You are not a member in this group')
    }

    if (!hasGroupManagementAccess(currentMembership.permission)) {
      throw new Error(RESET_POOL_MANAGER_REQUIRED_MESSAGE)
    }

    if (activeTaskIds.length > 0) {
      await tx.task_help_capacity.deleteMany({
        where: {
          task_id: {
            in: activeTaskIds,
          },
        },
      })
    }

    await tx.group.update({
      where: {
        id: request.groupId,
      },
      data: {
        active_pairing_id: null,
      },
    })

    if (activeTaskIds.length > 0) {
      await tx.task.deleteMany({
        where: {
          id: {
            in: activeTaskIds,
          },
        },
      })
    }
  }, { isolationLevel: 'Serializable' })
}
