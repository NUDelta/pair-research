import type { TurnstileAwareActionResponse } from '@/shared/turnstile/constants'
import { createServerFn } from '@tanstack/react-start'
import { groupSchema } from '@/features/groups/schemas/groupForm'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { isTurnstileVerificationBypassed } from '@/shared/turnstile/serverBypass'
import { buildCreateGroupData } from './buildCreateGroupData'
import { ensureAuthUserForInvite, upsertInviteProfile } from './groupManagement'

const createGroupRequestSchema = groupSchema.merge(turnstileTokenSchema)

export const createGroup = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(createGroupRequestSchema, data))
  .handler(async ({ data }): Promise<TurnstileAwareActionResponse> => {
    const turnstile = await verifyTurnstileToken({
      action: 'create-group',
      skipVerification: isTurnstileVerificationBypassed(),
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
        throw new Error('Assigned role must be one of the roles')
      }

      const memberEmailTitlesMap = normalizedMembers.reduce((acc, member) => {
        acc[member.email] = member.title
        return acc
      }, {} as Record<string, string>)

      const existingUsers = await prisma.profile.findMany({
        where: {
          email: {
            in: normalizedMembers.map(member => member.email),
          },
        },
        select: {
          id: true,
          email: true,
        },
      })

      const newUsers = normalizedMembers.filter(
        m => !existingUsers.some(u => u.email === m.email),
      )

      const ensuredNewUsers = await Promise.all(
        newUsers.map(async ({ email }) => ensureAuthUserForInvite(email)),
      )
      const invitedUsers = ensuredNewUsers.map(({ user }) => user)
      const allGroupMembers = [...existingUsers, ...invitedUsers]
      await prisma.$transaction(async (tx) => {
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

        if (invitedUsers.length > 0) {
          await Promise.all(invitedUsers.map(async invitedUser => upsertInviteProfile(tx, invitedUser)))
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
            ...allGroupMembers.map(u => ({
              group_id: group.id,
              user_id: u.id,
              role_id: createdRolesMap[memberEmailTitlesMap[u.email]?.trim()]?.id ?? creatorRole.id,
              permission: 'member' as const,
              is_pending: true,
            })),
          ],
        })
      })

      const inviteResults = await Promise.allSettled(
        ensuredNewUsers.map(async ensuredUser =>
          ensuredUser.serviceRoleSupabase.auth.admin.inviteUserByEmail(ensuredUser.user.email),
        ),
      )

      const failedInvites = inviteResults
        .filter(r => r.status === 'rejected')
        .map((_, i) => ensuredNewUsers[i].user.email)

      console.warn(`Failed invites (${failedInvites.length}): `, failedInvites.join(', '))

      return {
        success: true,
        message: `Group created successfully. ${invitedUsers.length} out of ${newUsers.length} new members invited.`,
      }
    }
    catch (error_) {
      console.error(error_)
      if (error_ instanceof Error) {
        return {
          success: false,
          message: error_.message,
        }
      }

      return {
        success: false,
        message: 'Failed to create group. Please try again.',
      }
    }
  })
