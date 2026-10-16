import { createServerFn } from '@tanstack/react-start'
import { getBulkMemberRoleUpdateError } from '@/features/groups/lib/groupManagementRules'
import { resolveBulkRoleActionPlan } from '@/features/groups/lib/groupRoleBulkActions'
import { createUserSafeActionError, getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { bulkManageGroupRolesSchema } from '../../schemas/groupManagement'
import { ensureCurrentGroupManager, findManagedGroup, withSerializableRetry } from './groupManagement'

/** Applies a validated role merge or removal within one transaction. */
export async function performBulkRoleAction(data: ReturnType<typeof bulkManageGroupRolesSchema.parse>): Promise<ActionResponse> {
  try {
    const { getUser } = await import('@/shared/supabase/server')
    const user = await getUser()
    const managementContext = await findManagedGroup(user.id, data.groupId)

    if (managementContext === null) {
      return {
        success: false,
        message: 'Only group managers can manage roles.',
      }
    }

    const { prisma } = managementContext
    const result = await withSerializableRetry(async () =>
      prisma.$transaction(async (tx) => {
        const actorPermission = await ensureCurrentGroupManager(tx, user.id, data.groupId, 'Only group managers can manage roles.')

        const roles = await tx.group_role.findMany({
          where: {
            group_id: data.groupId,
          },
          select: {
            id: true,
            title: true,
          },
        })

        const plan = resolveBulkRoleActionPlan({
          action: data.action,
          roles: roles.map(role => ({
            id: role.id.toString(),
            title: role.title,
          })),
          selectedRoleIds: data.roleIds,
          targetRoleId: data.targetRoleId,
          targetRoleTitle: data.targetRoleTitle,
        })

        if (!plan.success) {
          throw createUserSafeActionError(plan.message)
        }

        if (plan.sourceRoleIds.length === 0) {
          return {
            plan,
            movedMemberCount: 0,
          }
        }

        const sourceRoleIds = plan.sourceRoleIds.map(roleId => BigInt(roleId))
        let destinationRoleId = plan.targetRoleId === undefined ? undefined : BigInt(plan.targetRoleId)

        const assignedMembers = await tx.group_member.findMany({
          where: {
            group_id: data.groupId,
            role_id: {
              in: sourceRoleIds,
            },
          },
          select: {
            user_id: true,
            permission: true,
            is_pending: true,
          },
        })
        const movedMemberCount = assignedMembers.length

        if (movedMemberCount > 0) {
          const updateError = getBulkMemberRoleUpdateError({
            actorPermission,
            members: assignedMembers.map(member => ({
              userId: member.user_id,
              permission: member.permission,
              isPending: member.is_pending,
            })),
            targetUserIds: assignedMembers.map(member => member.user_id),
          })

          if (updateError !== null) {
            throw createUserSafeActionError(updateError)
          }
        }

        if (plan.createTargetRole) {
          const createdRole = await tx.group_role.create({
            data: {
              group_id: data.groupId,
              title: plan.targetRoleTitle,
            },
            select: {
              id: true,
            },
          })

          destinationRoleId = createdRole.id
        }

        if (destinationRoleId !== undefined && movedMemberCount > 0) {
          await tx.group_member.updateMany({
            where: {
              group_id: data.groupId,
              role_id: {
                in: sourceRoleIds,
              },
            },
            data: {
              role_id: destinationRoleId,
            },
          })
        }

        await tx.group_role.deleteMany({
          where: {
            group_id: data.groupId,
            id: {
              in: sourceRoleIds,
            },
          },
        })

        return {
          plan,
          movedMemberCount,
        }
      }, { isolationLevel: 'Serializable' }))

    if (result.plan.sourceRoleIds.length === 0) {
      return {
        success: true,
        message: 'No role changes were needed.',
      }
    }

    return {
      success: true,
      message: data.action === 'merge'
        ? `Merged ${result.plan.sourceRoleIds.length} ${result.plan.sourceRoleIds.length === 1 ? 'role' : 'roles'} into ${result.plan.targetRoleTitle}.`
        : `Removed ${result.plan.sourceRoleIds.length} ${result.plan.sourceRoleIds.length === 1 ? 'role' : 'roles'} and reassigned ${result.movedMemberCount} ${result.movedMemberCount === 1 ? 'member' : 'members'} to ${result.plan.targetRoleTitle}.`,
    }
  }
  catch (error) {
    console.error('[BULK_MANAGE_GROUP_ROLES]', error)
    return {
      success: false,
      message: getActionErrorMessage(error, 'Failed to update the selected roles.'),
    }
  }
}

export const bulkManageGroupRoles = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(bulkManageGroupRolesSchema, data))
  .handler(async ({ data }) => performBulkRoleAction(data))
