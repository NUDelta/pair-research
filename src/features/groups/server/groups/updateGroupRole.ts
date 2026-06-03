import { createServerFn } from '@tanstack/react-start'
import { normalizeRoleTitle } from '@/features/groups/lib/groupNormalization'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { updateGroupRoleSchema } from '../../schemas/groupManagement'
import { ensureCurrentGroupManager, findManagedGroup, withSerializableRetry } from './groupManagement'

export const updateGroupRole = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(updateGroupRoleSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const managementContext = await findManagedGroup(user.id, data.groupId)

      if (managementContext === null) {
        return {
          success: false,
          message: 'Only group managers can update roles.',
        }
      }

      const { prisma } = managementContext
      const roleId = BigInt(data.roleId)
      const normalizedTitle = normalizeRoleTitle(data.title)
      const didUpdate = await withSerializableRetry(async () =>
        prisma.$transaction(async (tx) => {
          await ensureCurrentGroupManager(tx, user.id, data.groupId, 'Only group managers can update roles.')

          const [role, existingRoles] = await Promise.all([
            tx.group_role.findFirst({
              where: {
                id: roleId,
                group_id: data.groupId,
              },
              select: {
                id: true,
                title: true,
              },
            }),
            tx.group_role.findMany({
              where: {
                group_id: data.groupId,
              },
              select: {
                id: true,
                title: true,
              },
            }),
          ])

          if (role === null) {
            throw new Error('Role not found.')
          }

          const duplicateRole = existingRoles.find(existingRole =>
            existingRole.id !== role.id
            && existingRole.title.trim().toLowerCase() === normalizedTitle.toLowerCase(),
          )

          if (duplicateRole !== undefined) {
            throw new Error('A role with that title already exists in this group.')
          }

          if (role.title.trim() === normalizedTitle) {
            return false
          }

          await tx.group_role.update({
            where: {
              id: role.id,
            },
            data: {
              title: normalizedTitle,
            },
          })

          return true
        }, { isolationLevel: 'Serializable' }))

      if (!didUpdate) {
        return {
          success: true,
          message: 'No role changes were needed.',
        }
      }

      return {
        success: true,
        message: 'Role updated successfully.',
      }
    }
    catch (error) {
      console.error('[UPDATE_GROUP_ROLE]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update the role.',
      }
    }
  })
