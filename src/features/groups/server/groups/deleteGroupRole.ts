import { createServerFn } from '@tanstack/react-start'
import { getGroupRoleDeleteError } from '@/features/groups/lib/groupManagementRules'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { getUser } from '@/shared/supabase/server'
import { deleteGroupRoleSchema } from '../../schemas/groupManagement'
import { findManagedGroup } from './groupManagement'

export const deleteGroupRole = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(deleteGroupRoleSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group admins can delete roles.',
        }
      }

      const { prisma } = adminContext
      const roleId = BigInt(data.roleId)
      const replacementRoleId = data.replacementRoleId === undefined ? undefined : BigInt(data.replacementRoleId)

      const [roles, members] = await Promise.all([
        prisma.group_role.findMany({
          where: {
            group_id: data.groupId,
          },
          select: {
            id: true,
          },
        }),
        prisma.group_member.findMany({
          where: {
            group_id: data.groupId,
          },
          select: {
            role_id: true,
          },
        }),
      ])

      const deleteError = getGroupRoleDeleteError({
        members: members.map(member => ({
          roleId: member.role_id.toString(),
        })),
        replacementRoleId: replacementRoleId?.toString(),
        roleIds: roles.map(role => role.id.toString()),
        targetRoleId: roleId.toString(),
      })

      if (deleteError !== null) {
        return {
          success: false,
          message: deleteError,
        }
      }

      const assignedMemberCount = members.filter(member => member.role_id === roleId).length

      await prisma.$transaction(async (tx) => {
        if (replacementRoleId !== undefined && assignedMemberCount > 0) {
          await tx.group_member.updateMany({
            where: {
              group_id: data.groupId,
              role_id: roleId,
            },
            data: {
              role_id: replacementRoleId,
            },
          })
        }

        await tx.group_role.delete({
          where: {
            id: roleId,
          },
        })
      })

      return {
        success: true,
        message: assignedMemberCount > 0
          ? `Role deleted and ${assignedMemberCount} ${assignedMemberCount === 1 ? 'member was' : 'members were'} reassigned.`
          : 'Role deleted successfully.',
      }
    }
    catch (error) {
      console.error('[DELETE_GROUP_ROLE]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to delete the role.',
      }
    }
  })
