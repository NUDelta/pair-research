import { createServerFn } from '@tanstack/react-start'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { getUser } from '@/shared/supabase/server'
import { addGroupMembersSchema } from '../../schemas/groupManagement'
import {
  ensureProfileForInvite,
  findManagedGroup,
  inviteCreatedUserByEmail,
  normalizeInviteEmail,
} from './groupManagement'

export const addGroupMembers = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(addGroupMembersSchema, data))
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
      const normalizedInvites = data.invites.map(invite => ({
        email: normalizeInviteEmail(invite.email),
        roleId: invite.roleId,
        isAdmin: invite.isAdmin,
      }))
      const seenEmails = new Set<string>()

      for (const invite of normalizedInvites) {
        if (seenEmails.has(invite.email)) {
          return {
            success: false,
            message: `Duplicate invite detected for ${invite.email}. Remove duplicates and try again.`,
          }
        }

        seenEmails.add(invite.email)
      }

      const uniqueRoleIds = [...new Set(normalizedInvites.map(invite => invite.roleId))].map(roleId => BigInt(roleId))
      const roles = await prisma.group_role.findMany({
        where: {
          group_id: data.groupId,
          id: { in: uniqueRoleIds },
        },
        select: {
          id: true,
        },
      })

      if (roles.length !== uniqueRoleIds.length) {
        return {
          success: false,
          message: 'Selected role is no longer available for this group.',
        }
      }

      const existingProfiles = await prisma.profile.findMany({
        where: {
          email: {
            in: normalizedInvites.map(invite => invite.email),
          },
        },
        select: {
          id: true,
          email: true,
        },
      })
      const existingProfilesByEmail = new Map(existingProfiles.map(profile => [profile.email, profile]))
      const existingMemberships = await prisma.group_member.findMany({
        where: {
          group_id: data.groupId,
          user_id: {
            in: existingProfiles.map(profile => profile.id),
          },
        },
        select: {
          user_id: true,
          is_pending: true,
        },
      })
      const existingMembershipByUserId = new Map(existingMemberships.map(membership => [membership.user_id, membership]))

      for (const invite of normalizedInvites) {
        const existingProfile = existingProfilesByEmail.get(invite.email)
        if (existingProfile === undefined) {
          continue
        }

        const existingMembership = existingMembershipByUserId.get(existingProfile.id)
        if (existingMembership !== undefined) {
          return {
            success: false,
            message: existingMembership.is_pending
              ? `${invite.email} already has a pending invitation to this group.`
              : `${invite.email} is already a member of this group.`,
          }
        }
      }

      const ensuredProfiles = await Promise.all(
        normalizedInvites.map(async invite => ({
          invite,
          ensuredProfile: await ensureProfileForInvite(invite.email),
        })),
      )

      await prisma.group_member.createMany({
        data: ensuredProfiles.map(({ invite, ensuredProfile }) => ({
          group_id: data.groupId,
          user_id: ensuredProfile.profile.id,
          role_id: BigInt(invite.roleId),
          is_admin: invite.isAdmin,
          is_pending: true,
        })),
      })

      await Promise.all(
        ensuredProfiles.map(async ({ invite, ensuredProfile }) => {
          if (!ensuredProfile.invitedNewUser || ensuredProfile.serviceRoleSupabase === undefined) {
            return
          }

          await inviteCreatedUserByEmail(ensuredProfile.serviceRoleSupabase, invite.email)
        }),
      )

      const addedCount = ensuredProfiles.length

      return {
        success: true,
        message: `${addedCount} ${addedCount === 1 ? 'group member' : 'group members'} added successfully.`,
      }
    }
    catch (error) {
      console.error('[ADD_GROUP_MEMBERS]', error)
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add group members.',
      }
    }
  })
