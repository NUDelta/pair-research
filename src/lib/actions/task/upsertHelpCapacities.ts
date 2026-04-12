import { createServerFn } from '@tanstack/react-start'
import { checkMembership } from '@/lib/actions/profile'
import { prisma } from '@/lib/prismaClient'
import { getUser } from '@/utils/supabase/server'

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

      await Promise.all(
        validUpdates.map(async ({ taskId, capacity }) =>
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
