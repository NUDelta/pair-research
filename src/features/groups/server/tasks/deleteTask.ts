import { createServerFn } from '@tanstack/react-start'
import { deleteTaskInputSchema } from '@/features/groups/server/groupActionInputs'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'

export const deleteTask = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(deleteTaskInputSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const { getGroupSession } = await import('@/shared/server/cloudflare/bindings.server')

      return await getGroupSession(data.groupId).deleteTask({
        groupId: data.groupId,
        userId: user.id,
        taskId: data.taskId,
      })
    }
    catch (error_) {
      console.error('Error upserting task:', error_)
      return {
        success: false,
        message: 'Failed to delete the task',
      }
    }
  })
