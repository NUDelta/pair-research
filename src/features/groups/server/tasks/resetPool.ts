import { createServerFn } from '@tanstack/react-start'
import { groupIdInputSchema } from '@/features/groups/server/groupActionInputs'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'

export const resetPool = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(groupIdInputSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const { getGroupSession } = await import('@/shared/server/cloudflare/bindings.server')

      return await getGroupSession(data.groupId).resetPool({
        groupId: data.groupId,
        userId: user.id,
      })
    }
    catch (error_) {
      console.error('Error resetting pool:', error_)
      return {
        success: false,
        message: 'Failed to reset the pool',
      }
    }
  })
