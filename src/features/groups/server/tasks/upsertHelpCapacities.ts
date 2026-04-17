import { createServerFn } from '@tanstack/react-start'
import { checkMembership } from '@/features/groups/server/checkMembership'

export const upsertHelpCapacities = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (
      typeof data !== 'object'
      || data === null
      || !('groupId' in data)
      || !('updates' in data)
      || !Array.isArray(data.updates)
    ) {
      throw new Error('Group ID and updates are required')
    }

    return {
      groupId: String(data.groupId),
      updates: data.updates.map(update => ({
        taskId: String((update as { taskId: unknown }).taskId),
        capacity:
          typeof (update as { capacity?: unknown }).capacity === 'number'
            ? (update as { capacity: number }).capacity
            : undefined,
      })),
    }
  })
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getPrismaClient } = await import('@/shared/server/prisma')
      const prisma = await getPrismaClient()
      const { getUser } = await import('@/shared/supabase/server')
      const validUpdates = data.updates.filter(
        update => update.capacity !== undefined && update.capacity >= 1 && update.capacity <= 5,
      )

      if (validUpdates.length === 0) {
        return {
          success: false,
          message: 'No valid capacities to update.',
        }
      }

      const user = await getUser()
      const membership = await checkMembership(user.id, data.groupId)

      if (!membership) {
        return {
          success: false,
          message: 'You are not a member in this group',
        }
      }

      const currentUserTask = await prisma.task.findFirst({
        where: {
          group_id: data.groupId,
          user_id: user.id,
          pairing_id: null,
          delete_pending: {
            not: true,
          },
        },
        select: {
          id: true,
        },
      })

      if (currentUserTask === null) {
        return {
          success: false,
          message: 'Join the current pool before rating other members',
        }
      }

      const allowedTasks = await prisma.task.findMany({
        where: {
          group_id: data.groupId,
          user_id: {
            not: user.id,
          },
          pairing_id: null,
          delete_pending: {
            not: true,
          },
        },
        select: {
          id: true,
        },
      })
      const allowedTaskIds = new Set(allowedTasks.map(task => String(task.id)))
      const scopedUpdates = validUpdates.filter(update => allowedTaskIds.has(update.taskId))

      if (scopedUpdates.length === 0) {
        return {
          success: false,
          message: 'No valid group tasks to update.',
        }
      }

      await Promise.all(
        scopedUpdates.map(async ({ taskId, capacity }) =>
          prisma.task_help_capacity.upsert({
            where: {
              task_id_user_id: {
                task_id: BigInt(taskId),
                user_id: user.id,
              },
            },
            update: {
              help_capacity: capacity,
            },
            create: {
              user_id: user.id,
              task_id: BigInt(taskId),
              help_capacity: capacity as number,
            },
          }),
        ),
      )

      return {
        success: true,
        message: 'Help capacities updated.',
      }
    }
    catch (error_) {
      console.error('Error upserting help capacities:', error_)
      return {
        success: false,
        message: 'Failed to upsert help capacities.',
      }
    }
  })
