import { createServerFn } from '@tanstack/react-start'
import { getAdminUpdateError } from '@/features/groups/lib/groupManagementRules'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { updateGroupMemberSchema } from '../../schemas/groupManagement'
import { findManagedGroup } from './groupManagement'

interface UpdateGroupMemberResponse extends ActionResponse {
  lostManagementAccess?: boolean
}

export const updateGroupMember = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(updateGroupMemberSchema, data))
  .handler(async ({ data }): Promise<UpdateGroupMemberResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group admins can update group members.',
        }
      }

      const { prisma, group } = adminContext
      const roleId = BigInt(data.roleId)

      const [role, members, targetMembership] = await Promise.all([
        prisma.group_role.findFirst({
          where: {
            id: roleId,
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
            user_id: true,
            is_admin: true,
            is_pending: true,
          },
        }),
        prisma.group_member.findUnique({
          where: {
            group_id_user_id: {
              group_id: data.groupId,
              user_id: data.userId,
            },
          },
          select: {
            role_id: true,
            is_admin: true,
          },
        }),
      ])

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

      const adminUpdateError = getAdminUpdateError({
        actorUserId: user.id,
        creatorId: group.creator_id,
        members: members.map(member => ({
          userId: member.user_id,
          isAdmin: member.is_admin,
          isPending: member.is_pending,
        })),
        targetUserId: data.userId,
        nextIsAdmin: data.isAdmin,
      })

      if (adminUpdateError !== null) {
        return {
          success: false,
          message: adminUpdateError,
        }
      }

      if (targetMembership.role_id === role.id && targetMembership.is_admin === data.isAdmin) {
        return {
          success: true,
          message: 'No member changes were needed.',
        }
      }

      await prisma.group_member.update({
        where: {
          group_id_user_id: {
            group_id: data.groupId,
            user_id: data.userId,
          },
        },
        data: {
          role_id: role.id,
          is_admin: data.isAdmin,
        },
      })

      return {
        success: true,
        message: 'Group member updated successfully.',
        lostManagementAccess: data.userId === user.id && !data.isAdmin,
      }
    }
    catch (error) {
      console.error('[UPDATE_GROUP_MEMBER]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update the group member.',
      }
    }
  })
