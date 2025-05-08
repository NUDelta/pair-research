'use server'

import { checkMembership } from '@/lib/actions/profile'
import { prisma } from '@/lib/prismaClient'
import { taskSchema } from '@/lib/validators/task'
import { getUser } from '@/utils/supabase/server'

export const upsertTask = async (
  _: any,
  formData: FormData,
) => {
  try {
    const res = taskSchema.safeParse({
      groupId: formData.get('groupId'),
      description: formData.get('description'),
    })

    if (!res.success) {
      console.error('Error validating task schema:', res.error.issues)
      return {
        success: false,
        schemaError: res.error.issues[0].message,
      }
    }

    const { groupId, description } = res.data

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
        description,
        updated_at: new Date(),
      },
      create: {
        description,
        user_id: user.id,
        group_id: groupId,
        created_at: new Date(),
        updated_at: new Date(),
        delete_pending: false,
      },
    })

    if (task.description !== description) {
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
