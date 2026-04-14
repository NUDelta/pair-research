import { createServerFn } from '@tanstack/react-start'
import { getMemberRemovalError } from '@/features/groups/lib/groupManagementRules'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { getUser } from '@/shared/supabase/server'
import { removeGroupMemberSchema } from '../../schemas/groupManagement'
import { findManagedGroup } from './groupManagement'

export const removeGroupMember = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(removeGroupMemberSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group admins can remove members.',
        }
      }

      const { prisma, group } = adminContext
      const members = await prisma.group_member.findMany({
        where: {
          group_id: data.groupId,
        },
        select: {
          user_id: true,
          is_admin: true,
          is_pending: true,
        },
      })

      const removalError = getMemberRemovalError({
        actorUserId: user.id,
        creatorId: group.creator_id,
        hasActivePairing: group.active_pairing_id !== null,
        members: members.map(member => ({
          userId: member.user_id,
          isAdmin: member.is_admin,
          isPending: member.is_pending,
        })),
        targetUserId: data.userId,
      })

      if (removalError !== null) {
        return {
          success: false,
          message: removalError,
        }
      }

      const targetMembership = await prisma.group_member.findUnique({
        where: {
          group_id_user_id: {
            group_id: data.groupId,
            user_id: data.userId,
          },
        },
        select: {
          is_pending: true,
        },
      })

      if (targetMembership === null) {
        return {
          success: false,
          message: 'Group member not found.',
        }
      }

      await prisma.$transaction(async (tx) => {
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
          throw new Error('Reset the active pairing before removing this member.')
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
      })

      return {
        success: true,
        message: targetMembership.is_pending
          ? 'Invitation removed successfully.'
          : 'Group member removed successfully.',
      }
    }
    catch (error) {
      console.error('[REMOVE_GROUP_MEMBER]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to remove the group member.',
      }
    }
  })
