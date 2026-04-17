import type { User } from '@supabase/supabase-js'
import type { TurnstileAwareActionResponse } from '@/shared/turnstile/constants'
import { createServerFn } from '@tanstack/react-start'
import { groupSchema } from '@/features/groups/schemas/groupForm'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { isTurnstileVerificationBypassed } from '@/shared/turnstile/serverBypass'
import { buildCreateGroupData } from './buildCreateGroupData'

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

      const group = await prisma.group.create({
        data: buildCreateGroupData({
          groupName,
          groupDescription,
          creatorId: user.id,
        }),
      })

      const createdRoles = await Promise.all(
        roles.map(async role =>
          prisma.group_role.create({
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

      const { createServiceRoleSupabase } = await import('@/shared/server/supabase/serviceRole')
      const serviceRoleSupabase = await createServiceRoleSupabase()
      const userCreations = await Promise.allSettled(
        newUsers.map(async ({ email }) => {
          const {
            data: { user },
            error,
          } = await serviceRoleSupabase.auth.admin.createUser({ email })
          return { user, error, email }
        }),
      )

      const successfulUsers = userCreations
        .filter(
          (r): r is PromiseFulfilledResult<{ user: User, error: null, email: string }> =>
            r.status === 'fulfilled'
            && r.value.user !== null
            && r.value.error === null,
        )
        .map(r => ({ id: r.value.user.id, email: r.value.email }))

      const profileCreations = await Promise.allSettled(
        successfulUsers.map(async u => prisma.profile.create({
          data: { id: u.id, email: u.email },
        })),
      )

      const inviteResults = await Promise.allSettled(
        successfulUsers.map(async u => serviceRoleSupabase.auth.admin.inviteUserByEmail(u.email)),
      )

      const allGroupMembers = [...existingUsers, ...successfulUsers]

      const groupMembersToCreate = [
        {
          group_id: group.id,
          user_id: user.id,
          role_id: creatorRole.id,
          is_admin: true,
          is_pending: false,
          joined_at: new Date(),
        },
        ...allGroupMembers.map(u => ({
          group_id: group.id,
          user_id: u.id,
          role_id: createdRolesMap[memberEmailTitlesMap[u.email]?.trim()]?.id ?? creatorRole.id,
          is_admin: false,
          is_pending: true,
        })),
      ]

      await prisma.group_member.createMany({ data: groupMembersToCreate })

      const successfulProfiles = profileCreations.filter(p => p.status === 'fulfilled')

      const failedInvites = inviteResults
        .filter(r => r.status === 'rejected')
        .map((_, i) => successfulUsers[i].email)

      console.warn(`Failed invites (${failedInvites.length}): `, failedInvites.join(', '))

      return {
        success: true,
        message: `Group created successfully. ${successfulProfiles.length} out of ${newUsers.length} new members invited.`,
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
