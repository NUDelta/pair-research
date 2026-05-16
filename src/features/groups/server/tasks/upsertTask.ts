import { createServerFn } from '@tanstack/react-start'
import { taskSchema } from '@/features/groups/schemas/taskForm'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'

export const upsertTask = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(taskSchema, data))
  .handler(async ({ data }) => {
    try {
      const { groupId, description } = data
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const { getGroupSession } = await import('@/shared/server/cloudflare/bindings.server')

      return await getGroupSession(groupId).upsertTask({
        groupId,
        userId: user.id,
        description,
      })
    }
    catch (error_) {
      console.error('Error upserting task:', error_)
      return {
        success: false,
        message: 'Failed to update the task',
      }
    }
  })
