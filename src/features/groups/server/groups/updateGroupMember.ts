import { createServerFn } from '@tanstack/react-start'
import { getPermissionUpdateError } from '@/features/groups/lib/groupManagementRules'
import { hasGroupManagementAccess } from '@/features/groups/lib/groupPermissions'
import { getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { updateGroupMemberSchema } from '../../schemas/groupManagement'
import { findManagedGroup, withSerializableRetry } from './groupManagement'

interface UpdateGroupMemberResponse extends ActionResponse {
  lostManagementAccess?: boolean
}

export const updateGroupMember = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(updateGroupMemberSchema, data))
  .handler(async ({ data }): Promise<UpdateGroupMemberResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const managementContext = await findManagedGroup(user.id, data.groupId)

      if (managementContext === null) {
        return {
          success: false,
          message: 'Only group managers can update group members.',
        }
      }

      const { prisma } = managementContext
      const roleId = BigInt(data.roleId)

      return await withSerializableRetry(async () =>
        prisma.$transaction(async (tx): Promise<UpdateGroupMemberResponse> => {
          const [role, actorMembership, members, targetMembership] = await Promise.all([
            tx.group_role.findFirst({
              where: {
                id: roleId,
                group_id: data.groupId,
              },
              select: {
                id: true,
              },
            }),
            tx.group_member.findFirst({
              where: {
                group_id: data.groupId,
                user_id: user.id,
                is_pending: false,
              },
              select: {
                permission: true,
              },
            }),
            tx.group_member.findMany({
              where: {
                group_id: data.groupId,
              },
              select: {
                user_id: true,
                permission: true,
                is_pending: true,
              },
            }),
            tx.group_member.findUnique({
              where: {
                group_id_user_id: {
                  group_id: data.groupId,
                  user_id: data.userId,
                },
              },
              select: {
                role_id: true,
                permission: true,
              },
            }),
          ])

          if (actorMembership === null || !hasGroupManagementAccess(actorMembership.permission)) {
            return {
              success: false,
              message: 'Only group managers can update group members.',
            }
          }

          if (role === null) {
            return {
              success: false,
              message: 'Selected role is no longer available for this group.',
            }
          }

          if (targetMembership === null) {
            return {
              success: false,
              message: 'Group member not found.',
            }
          }

          const permissionUpdateError = getPermissionUpdateError({
            actorUserId: user.id,
            actorPermission: actorMembership.permission,
            members: members.map(member => ({
              userId: member.user_id,
              permission: member.permission,
              isPending: member.is_pending,
            })),
            targetUserId: data.userId,
            nextPermission: data.permission,
          })

          if (permissionUpdateError !== null) {
            return {
              success: false,
              message: permissionUpdateError,
            }
          }

          if (targetMembership.role_id === role.id && targetMembership.permission === data.permission) {
            return {
              success: true,
              message: 'No member changes were needed.',
            }
          }

          await tx.group_member.update({
            where: {
              group_id_user_id: {
                group_id: data.groupId,
                user_id: data.userId,
              },
            },
            data: {
              role_id: role.id,
              permission: data.permission,
            },
          })

          return {
            success: true,
            message: 'Group member updated successfully.',
            lostManagementAccess: data.userId === user.id && !hasGroupManagementAccess(data.permission),
          }
        }, { isolationLevel: 'Serializable' }))
    }
    catch (error) {
      console.error('[UPDATE_GROUP_MEMBER]', error)
      return {
        success: false,
        message: getActionErrorMessage(error, 'Failed to update the group member.'),
      }
    }
  })
