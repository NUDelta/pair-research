import type { GroupSessionRuntime } from './runtime'
import type { GroupSessionRequest } from './types'
import { getMembership, getPrisma } from './database'
import { clearStoredGroupSession } from './storage'

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

    if (!membership.is_admin) {
      return {
        success: false,
        message: 'Only group admins can reset the pool',
      }
    }

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

    await prisma.$transaction(async (tx) => {
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
    })

    clearStoredGroupSession(runtime.ctx)
    runtime.broadcast({ type: 'pool:reset' })

    return {
      success: true,
      message: 'Pool reset successfully',
    }
  }
  catch (error) {
    console.error('Error resetting pool through group session:', error)
    return {
      success: false,
      message: 'Failed to reset the pool',
    }
  }
}
