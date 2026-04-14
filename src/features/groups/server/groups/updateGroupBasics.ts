import { createServerFn } from '@tanstack/react-start'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { getUser } from '@/shared/supabase/server'
import { updateGroupBasicsSchema } from '../../schemas/groupManagement'
import { findManagedGroup, normalizeNullableDescription } from './groupManagement'

export const updateGroupBasics = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(updateGroupBasicsSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group admins can update group settings.',
        }
      }

      const { prisma } = adminContext

      await prisma.group.update({
        where: {
          id: data.groupId,
        },
        data: {
          name: data.groupName.trim(),
          description: normalizeNullableDescription(data.groupDescription),
        },
      })

      return {
        success: true,
        message: 'Group information updated successfully.',
      }
    }
    catch (error) {
      console.error('[UPDATE_GROUP_BASICS]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update group information.',
      }
    }
  })
