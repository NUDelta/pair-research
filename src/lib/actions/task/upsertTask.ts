'use server'

import { checkMembership } from '@/lib/actions/profile'
import { prisma } from '@/lib/prismaClient'
import { getUser } from '@/utils/supabase/server'

export const upsertTask = async (
  groupId: string,
  taskDescription: string,
): Promise<ActionResponse> => {
  try {
    const user = await getUser()
    const membership = await checkMembership(user.id, groupId)

    if (!membership) {
      return {
        success: false,
        message: 'You are not a member in this group',
      }
    }

    const task = await prisma.task.upsert({
      where: {
        user_id_group_id: {
          user_id: user.id,
          group_id: groupId,
        },
      },
      update: {
        description: taskDescription,
        updated_at: new Date(),
      },
      create: {
        description: taskDescription,
        user_id: user.id,
        group_id: groupId,
        created_at: new Date(),
        updated_at: new Date(),
      },
    })

    if (task.description !== taskDescription) {
      return {
        success: false,
        message: 'Failed to update the task',
      }
    }

    return {
      success: true,
      message: 'You have update your task successfully',
    }
  }
  catch (error_) {
    console.error('Error upserting task:', error_)
    return {
      success: false,
      message: 'Failed to update the task',
    }
  }
}
