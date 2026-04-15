import { createServerFn } from '@tanstack/react-start'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { updateGroupRoleSchema } from '../../schemas/groupManagement'
import { findManagedGroup, normalizeRoleTitle } from './groupManagement'

export const updateGroupRole = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(updateGroupRoleSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group admins can update roles.',
        }
      }

      const { prisma } = adminContext
      const roleId = BigInt(data.roleId)
      const normalizedTitle = normalizeRoleTitle(data.title)
      const [role, existingRoles] = await Promise.all([
        prisma.group_role.findFirst({
          where: {
            id: roleId,
            group_id: data.groupId,
          },
          select: {
            id: true,
            title: true,
          },
        }),
        prisma.group_role.findMany({
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
        return {
          success: false,
          message: 'Role not found.',
        }
      }

      const duplicateRole = existingRoles.find(existingRole =>
        existingRole.id !== role.id
        && existingRole.title.trim().toLowerCase() === normalizedTitle.toLowerCase(),
      )

      if (duplicateRole !== undefined) {
        return {
          success: false,
          message: 'A role with that title already exists in this group.',
        }
      }

      if (role.title.trim() === normalizedTitle) {
        return {
          success: true,
          message: 'No role changes were needed.',
        }
      }

      await prisma.group_role.update({
        where: {
          id: role.id,
        },
        data: {
          title: normalizedTitle,
        },
      })

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
