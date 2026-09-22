import { createServerFn } from '@tanstack/react-start'
import { normalizeInviteEmail } from '@/features/groups/lib/groupNormalization'
import { canManagePrivilegedAccess, hasGroupManagementAccess, isPrivilegedPermission } from '@/features/groups/lib/groupPermissions'
import { createUserSafeActionError, getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { addGroupMembersSchema } from '../../schemas/groupManagement'
import {
  ensureAuthUserForInvite,
  ensureCurrentGroupManager,
  findManagedGroup,
  findUniqueAuthUsersByEmail,
  getInviteServiceRoleClient,
  upsertInviteProfile,
  withSerializableRetry,
} from './groupManagement'
import {
  hashInvitationRecipient,
  hashInvitationRequest,
  isInvitationOperationComplete,
  markInvitationOperationComplete,
  markInvitationOperationFailed,
  markInvitationProvisioned,
  reserveInvitationOperation,
  runLockedInvitationOperation,
} from './invitationRateLimit'

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
      const requestDigest = await hashInvitationRequest(JSON.stringify({
        kind: 'add_group_members',
        groupId: data.groupId,
        invites: normalizedInvites
          .map(invite => ({
            email: invite.email,
            roleId: invite.roleId,
            permission: invite.permission,
          }))
          .sort((left, right) => left.email.localeCompare(right.email)),
      }))
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

      const reservation = await reserveInvitationOperation(prisma, {
        actorId: user.id,
        groupId: data.groupId,
        operationId: data.operationId,
        requestDigest,
        recipientEmails: normalizedInvites.map(invite => invite.email),
      })

      if (
        reservation.size === normalizedInvites.length
        && [...reservation.values()].every(event => event.status === 'membership_created')
      ) {
        return { success: true, message: 'Group members were already added successfully.' }
      }

      // Supabase Auth calls deliberately run outside the database transaction.
      // The durable operation ledger makes retries reuse the same immutable Auth
      // UUID after a provider success / database failure boundary.
      let ensuredInviteProfiles
      try {
        const serviceRoleSupabase = await getInviteServiceRoleClient()
        const invitationEntries = await Promise.all(normalizedInvites.map(async invite => ({
          invite,
          recipientHash: await hashInvitationRecipient(invite.email),
        })))
        const unresolvedEmails = invitationEntries
          .filter(({ recipientHash }) => reservation.get(recipientHash)?.authUserId == null)
          .map(({ invite }) => invite.email)
        const existingAuthUsers = await findUniqueAuthUsersByEmail(serviceRoleSupabase, unresolvedEmails)
        ensuredInviteProfiles = await Promise.all(invitationEntries.map(async ({ invite, recipientHash }) => {
          const reservedEvent = reservation.get(recipientHash)
          const ensuredProfile = reservedEvent?.authUserId === null || reservedEvent === undefined
            ? await (async () => {
                const ensuredAuthUser = await ensureAuthUserForInvite(
                  invite.email,
                  serviceRoleSupabase,
                  existingAuthUsers.get(invite.email) ?? null,
                )
                return {
                  profile: await upsertInviteProfile(prisma, ensuredAuthUser.user),
                  invitedNewUser: ensuredAuthUser.invitedNewUser,
                  deliveryStatus: ensuredAuthUser.deliveryStatus,
                }
              })()
            : {
                profile: await upsertInviteProfile(prisma, {
                  id: reservedEvent.authUserId,
                  email: invite.email,
                }),
                invitedNewUser: reservedEvent.deliveryStatus !== 'existing',
                deliveryStatus: reservedEvent.deliveryStatus as 'existing' | 'sent' | 'unknown',
              }

          await markInvitationProvisioned(prisma, {
            actorId: user.id,
            operationId: data.operationId,
            recipientHash,
            requestDigest,
            authUserId: ensuredProfile.profile.id,
            deliveryStatus: ensuredProfile.deliveryStatus,
          })
          return { invite, ensuredProfile }
        }))
      }
      catch (error) {
        await markInvitationOperationFailed(prisma, {
          actorId: user.id,
          operationId: data.operationId,
          requestDigest,
          failureStage: 'auth_provisioning',
        })
        throw error
      }

      try {
        const { alreadyCompleted } = await runLockedInvitationOperation(prisma, {
          actorId: user.id,
          operationId: data.operationId,
          requestDigest,
        }, async (tx) => {
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

          await markInvitationOperationComplete(tx, {
            actorId: user.id,
            operationId: data.operationId,
            requestDigest,
            groupId: data.groupId,
          })
        })
        if (alreadyCompleted) {
          return { success: true, message: 'Group members were already added successfully.' }
        }
      }
      catch (error) {
        if (await isInvitationOperationComplete(prisma, {
          actorId: user.id,
          operationId: data.operationId,
          requestDigest,
        })) {
          return { success: true, message: 'Group members were already added successfully.' }
        }
        await markInvitationOperationFailed(prisma, {
          actorId: user.id,
          operationId: data.operationId,
          requestDigest,
          failureStage: 'membership_write',
        })
        throw error
      }

      const addedCount = ensuredInviteProfiles.length

      return {
        success: true,
        message: `${addedCount} ${addedCount === 1 ? 'group member' : 'group members'} added successfully.`,
      }
    }
    catch (error) {
      console.error('[ADD_GROUP_MEMBERS_FAILED]')
      return {
        success: false,
        message: getActionErrorMessage(error, 'Failed to add group members.'),
      }
    }
  })
