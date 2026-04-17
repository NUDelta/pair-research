import { createServerFn } from '@tanstack/react-start'
import { checkMembership } from '@/features/groups/server/checkMembership'

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (
      typeof data !== 'object'
      || data === null
      || !('taskId' in data)
      || !('groupId' in data)
    ) {
      throw new Error('Task ID and group ID are required')
    }

    return {
      taskId: String(data.taskId),
      groupId: String(data.groupId),
    }
  })
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getPrismaClient } = await import('@/shared/server/prisma')
      const prisma = await getPrismaClient()
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const id = BigInt(data.taskId)
      const membership = await checkMembership(user.id, data.groupId)

      if (!membership) {
        return {
          success: false,
          message: 'You are not a member in this group',
        }
      }

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

      if (task.group_id !== data.groupId) {
        return {
          success: false,
          message: 'Task does not belong to this group',
        }
      }

      if (task.pairing_id !== null) {
        return {
          success: false,
          message: 'You cannot leave the pool while your task is part of an active pairing',
        }
      }

      const tasksInGroup = await prisma.task.findMany({
        where: {
          group_id: data.groupId,
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

      await prisma.task_help_capacity.deleteMany({
        where: { task_id: id },
      })

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
  })
