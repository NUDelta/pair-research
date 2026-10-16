import '@tanstack/react-start/server-only'
import type { removeGroupMemberSchema } from '../../schemas/groupManagement'
import { getMemberRemovalError } from '@/features/groups/lib/groupManagementRules'
import { hasGroupManagementAccess } from '@/features/groups/lib/groupPermissions'
import { createUserSafeActionError, getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { findManagedGroup, withSerializableRetry } from './groupManagement'

/** Removes only the membership version observed by the manager. */
export async function performMemberRemoval(data: ReturnType<typeof removeGroupMemberSchema.parse>): Promise<ActionResponse> {
  try {
    const { getUser } = await import('@/shared/supabase/server')
    const user = await getUser()
    const managementContext = await findManagedGroup(user.id, data.groupId)

    if (managementContext === null) {
      return {
        success: false,
        message: 'Only group managers can remove members.',
      }
    }

    const { prisma } = managementContext
    const targetWasPending = await withSerializableRetry(async () =>
      prisma.$transaction(async (tx) => {
        const [actorMembership, group, members, targetMembership] = await Promise.all([
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
          tx.group.findUnique({
            where: {
              id: data.groupId,
            },
            select: {
              active_pairing_id: true,
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
              is_pending: true,
              joined_at: true,
            },
          }),
        ])

        if (actorMembership === null || !hasGroupManagementAccess(actorMembership.permission)) {
          throw createUserSafeActionError('Only group managers can remove members.')
        }

        if (group === null) {
          throw createUserSafeActionError('Group not found.')
        }

        if (targetMembership === null) {
          return false
        }

        if (targetMembership.joined_at.toISOString() !== data.expectedJoinedAt) {
          throw createUserSafeActionError('This membership changed. Refresh before removing it.')
        }

        const removalError = getMemberRemovalError({
          actorUserId: user.id,
          actorPermission: actorMembership.permission,
          hasActivePairing: group.active_pairing_id !== null,
          members: members.map(member => ({
            userId: member.user_id,
            permission: member.permission,
            isPending: member.is_pending,
          })),
          targetUserId: data.userId,
        })

        if (removalError !== null) {
          throw createUserSafeActionError(removalError)
        }

        const currentPoolTasks = await tx.task.findMany({
          where: {
            group_id: data.groupId,
            pairing_id: null,
            delete_pending: {
              not: true,
            },
          },
          select: {
            id: true,
          },
        })

        await tx.task_help_capacity.deleteMany({
          where: {
            task_id: {
              in: currentPoolTasks.map(task => task.id),
            },
            user_id: data.userId,
          },
        })

        const targetTask = await tx.task.findUnique({
          where: {
            user_id_group_id: {
              user_id: data.userId,
              group_id: data.groupId,
            },
          },
          select: {
            id: true,
            pairing_id: true,
          },
        })

        if (targetTask?.pairing_id !== null && targetTask?.pairing_id !== undefined) {
          throw createUserSafeActionError('Reset the active pairing before removing this member.')
        }

        if (targetTask !== null) {
          await tx.task_help_capacity.deleteMany({
            where: {
              task_id: targetTask.id,
            },
          })

          await tx.task.update({
            where: {
              id: targetTask.id,
            },
            data: {
              delete_pending: true,
              updated_at: new Date(),
            },
          })
        }

        await tx.group_member.delete({
          where: {
            group_id_user_id: {
              group_id: data.groupId,
              user_id: data.userId,
            },
          },
        })

        return targetMembership.is_pending
      }, { isolationLevel: 'Serializable' }))

    const { getGroupSession } = await import('@/shared/server/cloudflare/bindings.server')
    try {
      const cleanup = await getGroupSession(data.groupId).reconcileRemovedMember({ groupId: data.groupId, userId: data.userId })
      if (!cleanup.success) {
        throw new Error('Realtime cleanup failed')
      }
    }
    catch (error) {
      console.error('Member removed; realtime cleanup pending:', error)
      return { success: false, message: 'The member was removed. Retry to finish realtime cleanup.' }
    }

    return {
      success: true,
      message: targetWasPending
        ? 'Invitation removed successfully.'
        : 'Group member removed successfully.',
    }
  }
  catch (error) {
    console.error('[REMOVE_GROUP_MEMBER]', error)
    return {
      success: false,
      message: getActionErrorMessage(error, 'Failed to remove the group member.'),
    }
  }
}
