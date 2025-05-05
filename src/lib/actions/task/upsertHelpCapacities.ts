'use server'

import { checkMembership } from '@/lib/actions/profile'
import { prisma } from '@/lib/prismaClient'
import { getUser } from '@/utils/supabase/server'

export const upsertHelpCapacities = async (
  groupId: string,
  updates: { taskId: string, capacity: number | undefined }[],
): Promise<ActionResponse> => {
  try {
    const validUpdates = updates.filter(
      update => update.capacity !== undefined && update.capacity >= 1 && update.capacity <= 5,
    )

    if (validUpdates.length === 0) {
      return {
        success: false,
        message: 'No valid capacities to update.',
      }
    }

    const user = await getUser()
    const membership = await checkMembership(user.id, groupId)

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
}
