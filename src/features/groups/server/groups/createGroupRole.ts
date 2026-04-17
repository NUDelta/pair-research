import { createServerFn } from '@tanstack/react-start'
import { normalizeRoleTitle } from '@/features/groups/lib/groupNormalization'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { createGroupRoleSchema } from '../../schemas/groupManagement'
import { findManagedGroup } from './groupManagement'

export const createGroupRole = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(createGroupRoleSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group admins can create roles.',
        }
      }

      const { prisma } = adminContext
      const normalizedTitle = normalizeRoleTitle(data.title)
      const existingRoles = await prisma.group_role.findMany({
        where: {
          group_id: data.groupId,
        },
        select: {
          title: true,
        },
      })

      if (existingRoles.some(role => role.title.trim().toLowerCase() === normalizedTitle.toLowerCase())) {
        return {
          success: false,
          message: 'A role with that title already exists in this group.',
        }
      }

      await prisma.group_role.create({
        data: {
          group_id: data.groupId,
          title: normalizedTitle,
        },
      })

      return {
        success: true,
        message: 'Role created successfully.',
      }
    }
    catch (error) {
      console.error('[CREATE_GROUP_ROLE]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create the role.',
      }
    }
  })
