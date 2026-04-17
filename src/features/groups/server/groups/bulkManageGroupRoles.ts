import { createServerFn } from '@tanstack/react-start'
import { resolveBulkRoleActionPlan } from '@/features/groups/lib/groupRoleBulkActions'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { bulkManageGroupRolesSchema } from '../../schemas/groupManagement'
import { findManagedGroup } from './groupManagement'

export const bulkManageGroupRoles = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(bulkManageGroupRolesSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group admins can manage roles.',
        }
      }

      const { prisma } = adminContext
      const roles = await prisma.group_role.findMany({
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
        return {
          success: false,
          message: plan.message,
        }
      }

      if (plan.sourceRoleIds.length === 0) {
        return {
          success: true,
          message: 'No role changes were needed.',
        }
      }

      const sourceRoleIds = plan.sourceRoleIds.map(roleId => BigInt(roleId))
      let movedMemberCount = 0

      await prisma.$transaction(async (tx) => {
        let destinationRoleId = plan.targetRoleId === undefined ? undefined : BigInt(plan.targetRoleId)

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

        movedMemberCount = await tx.group_member.count({
          where: {
            group_id: data.groupId,
            role_id: {
              in: sourceRoleIds,
            },
          },
        })

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
      })

      return {
        success: true,
        message: data.action === 'merge'
          ? `Merged ${plan.sourceRoleIds.length} ${plan.sourceRoleIds.length === 1 ? 'role' : 'roles'} into ${plan.targetRoleTitle}.`
          : `Removed ${plan.sourceRoleIds.length} ${plan.sourceRoleIds.length === 1 ? 'role' : 'roles'} and reassigned ${movedMemberCount} ${movedMemberCount === 1 ? 'member' : 'members'} to ${plan.targetRoleTitle}.`,
      }
    }
    catch (error) {
      console.error('[BULK_MANAGE_GROUP_ROLES]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update the selected roles.',
      }
    }
  })
