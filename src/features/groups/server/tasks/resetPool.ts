import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@/shared/supabase/server'

export const resetPool = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'object' || data === null || !('groupId' in data)) {
      throw new Error('Group ID is required')
    }

    return {
      groupId: String(data.groupId),
    }
  })
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { prisma } = await import('@/shared/lib/prismaClient')
      const user = await getUser()
      const membership = await prisma.group_member.findFirst({
        where: {
          group_id: data.groupId,
          user_id: user.id,
          is_pending: false,
        },
        select: {
          is_admin: true,
        },
      })

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
          group_id: data.groupId,
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

          await tx.task.updateMany({
            where: {
              id: {
                in: activeTaskIds,
              },
            },
            data: {
              delete_pending: true,
              updated_at: new Date(),
            },
          })
        }

        await tx.group.update({
          where: {
            id: data.groupId,
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

      return {
        success: true,
        message: 'Pool reset successfully',
      }
    }
    catch (error_) {
      console.error('Error resetting pool:', error_)
      return {
        success: false,
        message: 'Failed to reset the pool',
      }
    }
  })
