import { createServerFn } from '@tanstack/react-start'

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
