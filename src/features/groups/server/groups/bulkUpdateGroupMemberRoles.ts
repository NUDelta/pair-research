import { createServerFn } from '@tanstack/react-start'
import { getBulkMemberRoleUpdateError } from '@/features/groups/lib/groupManagementRules'
import { hasGroupManagementAccess } from '@/features/groups/lib/groupPermissions'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { bulkUpdateGroupMemberRolesSchema } from '../../schemas/groupManagement'
import { findManagedGroup, withSerializableRetry } from './groupManagement'

export const bulkUpdateGroupMemberRoles = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(bulkUpdateGroupMemberRolesSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group managers can update group members.',
        }
      }

      const { prisma } = adminContext
      const targetUserIds = [...new Set(data.userIds)]
      const roleId = BigInt(data.roleId)

      return await withSerializableRetry(async () =>
        prisma.$transaction(async (tx): Promise<ActionResponse> => {
          const [role, actorMembership, members, targetMemberships] = await Promise.all([
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
            tx.group_member.findMany({
              where: {
                group_id: data.groupId,
                user_id: {
                  in: targetUserIds,
                },
              },
              select: {
                user_id: true,
                role_id: true,
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

          const bulkUpdateError = getBulkMemberRoleUpdateError({
            actorPermission: actorMembership.permission,
            members: members.map(member => ({
              userId: member.user_id,
              permission: member.permission,
              isPending: member.is_pending,
            })),
            targetUserIds,
          })

          if (bulkUpdateError !== null) {
            return {
              success: false,
              message: bulkUpdateError,
            }
          }

          const membersNeedingChange = targetMemberships
            .filter(membership => membership.role_id !== role.id)
            .map(membership => membership.user_id)

          if (membersNeedingChange.length === 0) {
            return {
              success: true,
              message: 'No selected member changes were needed.',
            }
          }

          await tx.group_member.updateMany({
            where: {
              group_id: data.groupId,
              user_id: {
                in: membersNeedingChange,
              },
            },
            data: {
              role_id: role.id,
            },
          })

          return {
            success: true,
            message: `Updated the role for ${membersNeedingChange.length} selected ${membersNeedingChange.length === 1 ? 'member' : 'members'}.`,
          }
        }, { isolationLevel: 'Serializable' }))
    }
    catch (error) {
      console.error('[BULK_UPDATE_GROUP_MEMBER_ROLES]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update the selected member roles.',
      }
    }
  })
