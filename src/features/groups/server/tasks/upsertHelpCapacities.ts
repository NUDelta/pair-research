import { createServerFn } from '@tanstack/react-start'
import { upsertHelpCapacitiesInputSchema } from '@/features/groups/server/groupActionInputs'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'

export const upsertHelpCapacities = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(upsertHelpCapacitiesInputSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const { getGroupSession } = await import('@/shared/server/cloudflare/bindings.server')

      return await getGroupSession(data.groupId).upsertRatings({
        groupId: data.groupId,
        userId: user.id,
        updates: data.updates,
      })
    }
    catch (error_) {
      console.error('Error upserting help capacities:', error_)
      return {
        success: false,
        message: 'Failed to upsert help capacities.',
      }
    }
  })
