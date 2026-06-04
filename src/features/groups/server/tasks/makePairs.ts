import { createServerFn } from '@tanstack/react-start'
import { groupIdInputSchema } from '@/features/groups/server/groupActionInputs'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'

interface MakePairsResponse {
  success: boolean
  message: string
  data?: {
    pairingId?: string
    pairs?: Array<{
      firstUser: string
      secondUser: string
      affinity: number
    }>
  }
}

export const makePairs = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(groupIdInputSchema, data))
  .handler(async ({ data }): Promise<MakePairsResponse> => {
    const { groupId } = data

    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const { getGroupSession } = await import('@/shared/server/cloudflare/bindings.server')

      return await getGroupSession(groupId).makePairs({
        groupId,
        userId: user.id,
      })
    }
    catch (error) {
      console.error(error)
      return { success: false, message: 'Failed to make pairs' }
    }
  })
