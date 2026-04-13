import { createServerFn } from '@tanstack/react-start'
import { taskSchema } from '@/features/groups/schemas/taskForm'
import { checkMembership } from '@/features/groups/server/checkMembership'
import { getUser } from '@/shared/supabase/server'

export const upsertTask = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => taskSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { groupId, description } = data
      const { prisma } = await import('@/shared/lib/prismaClient')

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
  })
