import type { TurnstileAwareActionResponse } from '@/shared/turnstile/constants'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { groupSchema } from '@/features/groups/schemas/groupForm'
import { createUserSafeActionError, getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { buildCreateGroupData } from './buildCreateGroupData'
import {
  ensureAuthUserForInvite,
  findUniqueAuthUsersByEmail,
  getInviteServiceRoleClient,
  upsertInviteProfile,
} from './groupManagement'
import {
  findCompletedInvitationOperation,
  hashInvitationRecipient,
  hashInvitationRequest,
  markInvitationOperationComplete,
  markInvitationOperationFailed,
  markInvitationProvisioned,
  reserveInvitationOperation,
  runLockedInvitationOperation,
} from './invitationRateLimit'

const createGroupRequestSchema = groupSchema.merge(turnstileTokenSchema).extend({
  operationId: z.string().uuid('Group creation operation ID must be a valid UUID'),
})

export const createGroup = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(createGroupRequestSchema, data))
  .handler(async ({ data }): Promise<TurnstileAwareActionResponse> => {
    const turnstile = await verifyTurnstileToken({
      action: 'create-group',
      token: data.turnstileToken,
    })

    if (!turnstile.success) {
      return createTurnstileErrorResponse(
        turnstile.message,
        turnstile.code ?? TURNSTILE_ERROR_CODES.failed,
      )
    }

    try {
      const { getPrismaClient } = await import('@/shared/server/prisma')
      const prisma = await getPrismaClient()
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const {
        groupName,
        groupDescription,
        roles,
        assignedRole,
        members,
      } = data
      const creatorEmail = user.email?.trim().toLowerCase()
      const seenMemberEmails = new Set<string>()
      const normalizedMembers = members
        .map(member => ({
          email: member.email.trim().toLowerCase(),
          title: member.title.trim(),
        }))
        .filter((member) => {
          if (member.email.length === 0 || member.email === creatorEmail || seenMemberEmails.has(member.email)) {
            return false
          }

          seenMemberEmails.add(member.email)
          return true
        })

      if (!roles.some(role => role.title === assignedRole)) {
        throw createUserSafeActionError('Assigned role must be one of the roles')
      }

      const memberEmailTitlesMap = normalizedMembers.reduce((acc, member) => {
        acc[member.email] = member.title
        return acc
      }, {} as Record<string, string>)
      const requestDigest = await hashInvitationRequest(JSON.stringify({
        kind: 'group_create',
        groupName: groupName.trim(),
        groupDescription: groupDescription?.trim() ?? '',
        assignedRole: assignedRole.trim(),
        roles: roles.map(role => role.title.trim()).sort(),
        members: normalizedMembers
          .map(member => ({ email: member.email, title: member.title }))
          .sort((left, right) => left.email.localeCompare(right.email)),
      }))

      const reservation = await reserveInvitationOperation(prisma, {
        actorId: user.id,
        operationId: data.operationId,
        requestDigest,
        recipientEmails: normalizedMembers.map(member => member.email),
        reserveGroupCreation: true,
      })

      const completedOperation = await findCompletedInvitationOperation(prisma, {
        actorId: user.id,
        operationId: data.operationId,
        requestDigest,
      })
      if (completedOperation !== null) {
        return { success: true, message: 'Group was already created successfully.' }
      }

      let ensuredMembers
      try {
        const serviceRoleSupabase = await getInviteServiceRoleClient()
        const invitationEntries = await Promise.all(normalizedMembers.map(async member => ({
          member,
          recipientHash: await hashInvitationRecipient(member.email),
        })))
        const unresolvedEmails = invitationEntries
          .filter(({ recipientHash }) => reservation.get(recipientHash)?.authUserId == null)
          .map(({ member }) => member.email)
        const existingAuthUsers = await findUniqueAuthUsersByEmail(serviceRoleSupabase, unresolvedEmails)
        ensuredMembers = await Promise.all(invitationEntries.map(async ({ member, recipientHash }) => {
          const reservedEvent = reservation.get(recipientHash)
          const ensuredProfile = reservedEvent?.authUserId === null || reservedEvent === undefined
            ? await (async () => {
                const ensuredAuthUser = await ensureAuthUserForInvite(
                  member.email,
                  serviceRoleSupabase,
                  existingAuthUsers.get(member.email) ?? null,
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
                  email: member.email,
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
          return { member, ensuredProfile }
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
          const group = await tx.group.create({
            data: buildCreateGroupData({
              groupName,
              groupDescription,
              creatorId: user.id,
            }),
          })

          const createdRoles = await Promise.all(
            roles.map(async role =>
              tx.group_role.create({
                data: {
                  group_id: group.id,
                  title: role.title.trim(),
                },
              }),
            ),
          )

          const createdRolesMap = createdRoles.reduce<Record<string, { id: bigint }>>((acc, role) => {
            acc[role.title.trim()] = role
            return acc
          }, {})

          if (createdRoles.length === 0) {
            throw new Error('Roles creation failed')
          }

          const creatorRole = createdRolesMap[assignedRole.trim()]

          if (creatorRole === undefined) {
            throw new Error('Creator role not found')
          }

          await tx.group_member.createMany({
            data: [
              {
                group_id: group.id,
                user_id: user.id,
                role_id: creatorRole.id,
                permission: 'owner' as const,
                is_pending: false,
                joined_at: new Date(),
              },
              ...ensuredMembers.map(({ member, ensuredProfile }) => ({
                group_id: group.id,
                user_id: ensuredProfile.profile.id,
                role_id: createdRolesMap[memberEmailTitlesMap[member.email]?.trim()]?.id ?? creatorRole.id,
                permission: 'member' as const,
                is_pending: true,
              })),
            ],
          })

          await markInvitationOperationComplete(tx, {
            actorId: user.id,
            operationId: data.operationId,
            requestDigest,
            groupId: group.id,
          })
        })
        if (alreadyCompleted) {
          return { success: true, message: 'Group was already created successfully.' }
        }
      }
      catch (error) {
        await markInvitationOperationFailed(prisma, {
          actorId: user.id,
          operationId: data.operationId,
          requestDigest,
          failureStage: 'group_membership_write',
        })
        throw error
      }

      const newlyInvitedCount = ensuredMembers.filter(({ ensuredProfile }) => ensuredProfile.invitedNewUser).length
      const deliveryUnknownCount = ensuredMembers.filter(({ ensuredProfile }) => ensuredProfile.deliveryStatus === 'unknown').length

      return {
        success: true,
        message: deliveryUnknownCount === 0
          ? `Group created successfully. ${newlyInvitedCount} new members invited.`
          : `Group created successfully. ${newlyInvitedCount - deliveryUnknownCount} invites sent; ${deliveryUnknownCount} deliveries require verification.`,
      }
    }
    catch (error_) {
      console.error('[CREATE_GROUP_FAILED]')
      return {
        success: false,
        message: getActionErrorMessage(error_, 'Failed to create group. Please try again.'),
      }
    }
  })
