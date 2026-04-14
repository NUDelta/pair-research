import { createServerFn } from '@tanstack/react-start'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { getUser } from '@/shared/supabase/server'
import { addGroupMemberSchema } from '../../schemas/groupManagement'
import {
  ensureProfileForInvite,
  findManagedGroup,
  inviteCreatedUserByEmail,
  normalizeInviteEmail,
} from './groupManagement'

export const addGroupMember = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(addGroupMemberSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const user = await getUser()
      const adminContext = await findManagedGroup(user.id, data.groupId)

      if (adminContext === null) {
        return {
          success: false,
          message: 'Only group admins can add members.',
        }
      }

      const { prisma } = adminContext
      const normalizedEmail = normalizeInviteEmail(data.email)
      const roleId = BigInt(data.roleId)

      const role = await prisma.group_role.findFirst({
        where: {
          id: roleId,
          group_id: data.groupId,
        },
        select: {
          id: true,
        },
      })

      if (role === null) {
        return {
          success: false,
          message: 'Selected role is no longer available for this group.',
        }
      }

      const ensuredProfile = await ensureProfileForInvite(normalizedEmail)
      const existingMembership = await prisma.group_member.findUnique({
        where: {
          group_id_user_id: {
            group_id: data.groupId,
            user_id: ensuredProfile.profile.id,
          },
        },
        select: {
          is_pending: true,
        },
      })

      if (existingMembership !== null) {
        return {
          success: false,
          message: existingMembership.is_pending
            ? 'That person already has a pending invitation to this group.'
            : 'That person is already a member of this group.',
        }
      }

      await prisma.group_member.create({
        data: {
          group_id: data.groupId,
          user_id: ensuredProfile.profile.id,
          role_id: role.id,
          is_admin: data.isAdmin,
          is_pending: true,
        },
      })

      if (ensuredProfile.invitedNewUser && ensuredProfile.serviceRoleSupabase !== undefined) {
        await inviteCreatedUserByEmail(ensuredProfile.serviceRoleSupabase, normalizedEmail)
      }

      return {
        success: true,
        message: 'Group member added successfully.',
      }
    }
    catch (error) {
      console.error('[ADD_GROUP_MEMBER]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add group member.',
      }
    }
  })
