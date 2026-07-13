import { createServerFn } from '@tanstack/react-start'
import { normalizeNullableDescription } from '@/features/groups/lib/groupNormalization'
import { getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { updateGroupBasicsSchema } from '../../schemas/groupManagement'
import { ensureCurrentGroupManager, findManagedGroup, withSerializableRetry } from './groupManagement'

export const updateGroupBasics = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(updateGroupBasicsSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const managementContext = await findManagedGroup(user.id, data.groupId)

      if (managementContext === null) {
        return {
          success: false,
          message: 'Only group managers can update group settings.',
        }
      }

      const { prisma } = managementContext

      await withSerializableRetry(async () =>
        prisma.$transaction(async (tx) => {
          await ensureCurrentGroupManager(tx, user.id, data.groupId, 'Only group managers can update group settings.')

          await tx.group.update({
            where: {
              id: data.groupId,
            },
            data: {
              name: data.groupName.trim(),
              description: normalizeNullableDescription(data.groupDescription),
            },
          })
        }, { isolationLevel: 'Serializable' }))

      return {
        success: true,
        message: 'Group information updated successfully.',
      }
    }
    catch (error) {
      console.error('[UPDATE_GROUP_BASICS]', error)
      return {
        success: false,
        message: getActionErrorMessage(error, 'Failed to update group information.'),
      }
    }
  })
