'use server'

import { prisma } from '@/lib/prismaClient'
import { getUser } from '@/utils/supabase/server'

export const deleteTask = async (
  taskId: string,
): Promise<ActionResponse> => {
  try {
    const user = await getUser()
    const id = BigInt(taskId)

    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task || task.user_id !== user.id) {
      return {
        success: false,
        message: 'You are not allowed to delete this task',
      }
    }

    await prisma.task_help_capacity.deleteMany({
      where: { task_id: id },
    })

    await prisma.task.delete({ where: { id } })

    return {
      success: true,
      message: 'You have delete your task successfully',
    }
  }
  catch (error_) {
    console.error('Error upserting task:', error_)
    return {
      success: false,
      message: 'Failed to delete the task',
    }
  }
}
