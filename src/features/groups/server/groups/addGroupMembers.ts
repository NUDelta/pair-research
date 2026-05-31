import { createServerFn } from '@tanstack/react-start'
import { normalizeInviteEmail } from '@/features/groups/lib/groupNormalization'
import { canManagePrivilegedAccess, hasGroupManagementAccess, isPrivilegedPermission } from '@/features/groups/lib/groupPermissions'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { addGroupMembersSchema } from '../../schemas/groupManagement'
import {
  ensureProfileForInvite,
  findManagedGroup,
  inviteCreatedUserByEmail,
  withSerializableRetry,
} from './groupManagement'

export const addGroupMembers = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(addGroupMembersSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
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
        permission: invite.permission,
      }))

      if (
        !canManagePrivilegedAccess(adminContext.actorPermission)
        && normalizedInvites.some(invite => isPrivilegedPermission(invite.permission))
      ) {
        return {
          success: false,
          message: 'Only group owners can invite owners or admins.',
        }
      }

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

      await withSerializableRetry(async () =>
        prisma.$transaction(async (tx) => {
          const [currentActorMembership, currentRoles, currentMemberships] = await Promise.all([
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
            tx.group_role.findMany({
              where: {
                group_id: data.groupId,
                id: { in: uniqueRoleIds },
              },
              select: {
                id: true,
              },
            }),
            tx.group_member.findMany({
              where: {
                group_id: data.groupId,
                user_id: {
                  in: ensuredProfiles.map(({ ensuredProfile }) => ensuredProfile.profile.id),
                },
              },
              select: {
                user_id: true,
                is_pending: true,
                profile: {
                  select: {
                    email: true,
                  },
                },
              },
            }),
          ])

          if (currentActorMembership === null || !hasGroupManagementAccess(currentActorMembership.permission)) {
            throw new Error('Only group admins can add members.')
          }

          if (
            !canManagePrivilegedAccess(currentActorMembership.permission)
            && normalizedInvites.some(invite => isPrivilegedPermission(invite.permission))
          ) {
            throw new Error('Only group owners can invite owners or admins.')
          }

          if (currentRoles.length !== uniqueRoleIds.length) {
            throw new Error('Selected role is no longer available for this group.')
          }

          const currentMembershipByUserId = new Map(currentMemberships.map(membership => [membership.user_id, membership]))
          for (const { ensuredProfile } of ensuredProfiles) {
            const currentMembership = currentMembershipByUserId.get(ensuredProfile.profile.id)
            if (currentMembership === undefined) {
              continue
            }

            throw new Error(currentMembership.is_pending
              ? `${currentMembership.profile.email} already has a pending invitation to this group.`
              : `${currentMembership.profile.email} is already a member of this group.`)
          }

          await tx.group_member.createMany({
            data: ensuredProfiles.map(({ invite, ensuredProfile }) => ({
              group_id: data.groupId,
              user_id: ensuredProfile.profile.id,
              role_id: BigInt(invite.roleId),
              permission: invite.permission,
              is_pending: true,
            })),
          })
        }, { isolationLevel: 'Serializable' }))

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
