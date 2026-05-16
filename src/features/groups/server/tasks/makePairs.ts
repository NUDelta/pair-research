import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
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

const makePairsInputSchema = z.object({
  groupId: z.string(),
})

export const makePairs = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(makePairsInputSchema, data))
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
