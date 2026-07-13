import { createServerFn } from '@tanstack/react-start'
import { normalizeRoleTitle } from '@/features/groups/lib/groupNormalization'
import { createUserSafeActionError, getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { createGroupRoleSchema } from '../../schemas/groupManagement'
import { ensureCurrentGroupManager, findManagedGroup, withSerializableRetry } from './groupManagement'

export const createGroupRole = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(createGroupRoleSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const managementContext = await findManagedGroup(user.id, data.groupId)

      if (managementContext === null) {
        return {
          success: false,
          message: 'Only group managers can create roles.',
        }
      }

      const { prisma } = managementContext
      const normalizedTitle = normalizeRoleTitle(data.title)
      await withSerializableRetry(async () =>
        prisma.$transaction(async (tx) => {
          await ensureCurrentGroupManager(tx, user.id, data.groupId, 'Only group managers can create roles.')

          const existingRoles = await tx.group_role.findMany({
            where: {
              group_id: data.groupId,
            },
            select: {
              title: true,
            },
          })

          if (existingRoles.some(role => role.title.trim().toLowerCase() === normalizedTitle.toLowerCase())) {
            throw createUserSafeActionError('A role with that title already exists in this group.')
          }

          await tx.group_role.create({
            data: {
              group_id: data.groupId,
              title: normalizedTitle,
            },
          })
        }, { isolationLevel: 'Serializable' }))

      return {
        success: true,
        message: 'Role created successfully.',
      }
    }
    catch (error) {
      console.error('[CREATE_GROUP_ROLE]', error)
      return {
        success: false,
        message: getActionErrorMessage(error, 'Failed to create the role.'),
      }
    }
  })
