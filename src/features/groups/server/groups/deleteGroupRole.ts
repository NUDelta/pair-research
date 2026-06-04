import { createServerFn } from '@tanstack/react-start'
import { getGroupRoleDeleteError } from '@/features/groups/lib/groupManagementRules'
import { createUserSafeActionError, getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { deleteGroupRoleSchema } from '../../schemas/groupManagement'
import { ensureCurrentGroupManager, findManagedGroup, withSerializableRetry } from './groupManagement'

export const deleteGroupRole = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(deleteGroupRoleSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const managementContext = await findManagedGroup(user.id, data.groupId)

      if (managementContext === null) {
        return {
          success: false,
          message: 'Only group managers can delete roles.',
        }
      }

      const { prisma } = managementContext
      const roleId = BigInt(data.roleId)
      const replacementRoleId = data.replacementRoleId === undefined ? undefined : BigInt(data.replacementRoleId)

      const assignedMemberCount = await withSerializableRetry(async () =>
        prisma.$transaction(async (tx) => {
          await ensureCurrentGroupManager(tx, user.id, data.groupId, 'Only group managers can delete roles.')

          const [roles, members] = await Promise.all([
            tx.group_role.findMany({
              where: {
                group_id: data.groupId,
              },
              select: {
                id: true,
              },
            }),
            tx.group_member.findMany({
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
            throw createUserSafeActionError(deleteError)
          }

          const memberCount = members.filter(member => member.role_id === roleId).length

          if (replacementRoleId !== undefined && memberCount > 0) {
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

          return memberCount
        }, { isolationLevel: 'Serializable' }))

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
        message: getActionErrorMessage(error, 'Failed to delete the role.'),
      }
    }
  })
