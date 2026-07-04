import { createServerFn } from '@tanstack/react-start'
import { normalizeInviteEmail } from '@/features/groups/lib/groupNormalization'
import { canManagePrivilegedAccess, hasGroupManagementAccess, isPrivilegedPermission } from '@/features/groups/lib/groupPermissions'
import { createUserSafeActionError, getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { addGroupMembersSchema } from '../../schemas/groupManagement'
import {
  ensureCurrentGroupManager,
  ensureProfileForInvite,
  findManagedGroup,
  inviteCreatedUserByEmail,
  withSerializableRetry,
} from './groupManagement'

interface LockedMembershipRow {
  permission: 'owner' | 'admin' | 'member'
}

export const addGroupMembers = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(addGroupMembersSchema, data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const managementContext = await findManagedGroup(user.id, data.groupId)

      if (managementContext === null) {
        return {
          success: false,
          message: 'Only group managers can add members.',
        }
      }

      const { prisma } = managementContext
      const normalizedInvites = data.invites.map(invite => ({
        email: normalizeInviteEmail(invite.email),
        roleId: invite.roleId,
        permission: invite.permission,
      }))

      if (
        !canManagePrivilegedAccess(managementContext.actorPermission)
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

      await withSerializableRetry(async () =>
        prisma.$transaction(async (tx) => {
          const currentActorPermission = await ensureCurrentGroupManager(tx, user.id, data.groupId, 'Only group managers can add members.')

          if (
            !canManagePrivilegedAccess(currentActorPermission)
            && normalizedInvites.some(invite => isPrivilegedPermission(invite.permission))
          ) {
            throw createUserSafeActionError('Only group owners can invite owners or admins.')
          }

          const currentRoles = await tx.group_role.findMany({
            where: {
              group_id: data.groupId,
              id: { in: uniqueRoleIds },
            },
            select: {
              id: true,
            },
          })

          if (currentRoles.length !== uniqueRoleIds.length) {
            throw createUserSafeActionError('Selected role is no longer available for this group.')
          }
        }, { isolationLevel: 'Serializable' }))

      const ensuredProfiles = await withSerializableRetry(async () =>
        prisma.$transaction(async (tx) => {
          const [currentActorMembership] = await tx.$queryRaw<LockedMembershipRow[]>`
            select permission
            from public.group_member
            where group_id = ${data.groupId}::uuid
              and user_id = ${user.id}::uuid
              and is_pending = false
            for update
          `

          if (currentActorMembership === undefined || !hasGroupManagementAccess(currentActorMembership.permission)) {
            throw createUserSafeActionError('Only group managers can add members.')
          }

          if (
            !canManagePrivilegedAccess(currentActorMembership.permission)
            && normalizedInvites.some(invite => isPrivilegedPermission(invite.permission))
          ) {
            throw createUserSafeActionError('Only group owners can invite owners or admins.')
          }

          const currentRoles = await tx.group_role.findMany({
            where: {
              group_id: data.groupId,
              id: { in: uniqueRoleIds },
            },
            select: {
              id: true,
            },
          })

          if (currentRoles.length !== uniqueRoleIds.length) {
            throw createUserSafeActionError('Selected role is no longer available for this group.')
          }

          const ensuredInviteProfiles = await Promise.all(
            normalizedInvites.map(async invite => ({
              invite,
              ensuredProfile: await ensureProfileForInvite(invite.email, tx),
            })),
          )

          const currentMemberships = await tx.group_member.findMany({
            where: {
              group_id: data.groupId,
              user_id: {
                in: ensuredInviteProfiles.map(({ ensuredProfile }) => ensuredProfile.profile.id),
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
          })

          const currentMembershipByUserId = new Map(currentMemberships.map(membership => [membership.user_id, membership]))
          for (const { ensuredProfile } of ensuredInviteProfiles) {
            const currentMembership = currentMembershipByUserId.get(ensuredProfile.profile.id)
            if (currentMembership === undefined) {
              continue
            }

            throw createUserSafeActionError(currentMembership.is_pending
              ? `${currentMembership.profile.email} already has a pending invitation to this group.`
              : `${currentMembership.profile.email} is already a member of this group.`)
          }

          const createdMemberships = await tx.group_member.createMany({
            data: ensuredInviteProfiles.map(({ invite, ensuredProfile }) => ({
              group_id: data.groupId,
              user_id: ensuredProfile.profile.id,
              role_id: BigInt(invite.roleId),
              permission: invite.permission,
              is_pending: true,
            })),
            skipDuplicates: true,
          })

          if (createdMemberships.count !== ensuredInviteProfiles.length) {
            throw createUserSafeActionError('One or more invitees already has a group membership. Refresh and try again.')
          }

          return ensuredInviteProfiles
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
        message: getActionErrorMessage(error, 'Failed to add group members.'),
      }
    }
  })
