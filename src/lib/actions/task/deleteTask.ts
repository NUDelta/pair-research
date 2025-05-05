'use server'

import { prisma } from '@/lib/prismaClient'
import { getUser } from '@/utils/supabase/server'

export const deleteTask = async (
  taskId: string,
  groupId: string,
): Promise<ActionResponse> => {
  try {
    const user = await getUser()
    const id = BigInt(taskId)

    const task = await prisma.task.findUnique({
      where: { id },
    })

    if (!task) {
      return {
        success: false,
        message: 'Task not found',
      }
    }

    if (task.user_id !== user.id) {
      return {
        success: false,
        message: 'You are not allowed to delete this task',
      }
    }

    // Delete all help capacities submitted by this user on tasks in the same group
    const tasksInGroup = await prisma.task.findMany({
      where: {
        group_id: groupId,
        pairing_id: null,
      },
      select: {
        id: true,
      },
    })

    const taskIds = tasksInGroup.map(t => t.id)

    await prisma.task_help_capacity.deleteMany({
      where: {
        task_id: { in: taskIds },
        user_id: user.id,
      },
    })

    // Delete help capacities other people submitted for this task
    await prisma.task_help_capacity.deleteMany({
      where: { task_id: id },
    })

    // Finally delete the task itself (mark it as pending deletion)
    await prisma.task.update({
      where: {
        id,
      },
      data: {
        delete_pending: true,
      },
    })

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
