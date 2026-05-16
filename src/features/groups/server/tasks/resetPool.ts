import { createServerFn } from '@tanstack/react-start'

export const resetPool = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'object' || data === null || !('groupId' in data)) {
      throw new Error('Group ID is required')
    }

    return {
      groupId: String(data.groupId),
    }
  })
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
