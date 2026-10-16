import type { GroupValues } from '@/features/groups/schemas/groupForm'
import type { TurnstileAwareActionResponse, TurnstileTokenValues } from '@/shared/turnstile/constants'
import { createServerFn } from '@tanstack/react-start'
import { groupSchema } from '@/features/groups/schemas/groupForm'
import { createUserSafeActionError, getActionErrorMessage } from '@/features/groups/server/actionErrors'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { buildCreateGroupData } from './buildCreateGroupData'
import { ensureAuthUserForInvite, upsertInviteProfile } from './groupManagement'

const createGroupRequestSchema = groupSchema.merge(turnstileTokenSchema)

/** Creates a group from validated form data. */
export async function createGroupFromForm(data: GroupValues & TurnstileTokenValues): Promise<TurnstileAwareActionResponse> {
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

    const roleTitles = new Set(roles.map(role => role.title))

    if (!roleTitles.has(assignedRole)) {
      throw createUserSafeActionError('Assigned role must be one of the roles')
    }

    if (normalizedMembers.some(member => !roleTitles.has(member.title))) {
      throw createUserSafeActionError('Each invited member must have one of the group roles.')
    }

    const memberEmailTitlesMap = new Map(normalizedMembers.map(member => [member.email, member.title]))

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

      const createdRolesMap = new Map(createdRoles.map(role => [role.title.trim(), role]))

      if (createdRoles.length === 0) {
        throw new Error('Roles creation failed')
      }

      const creatorRole = createdRolesMap.get(assignedRole)

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
          ...allGroupMembers.map((member) => {
            const title = memberEmailTitlesMap.get(member.email)
            const role = title === undefined ? undefined : createdRolesMap.get(title)

            if (role === undefined) {
              throw new Error('Invited member role not found')
            }

            return {
              group_id: group.id,
              user_id: member.id,
              role_id: role.id,
              permission: 'member' as const,
              is_pending: true,
            }
          }),
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
    return {
      success: false,
      message: getActionErrorMessage(error_, 'Failed to create group. Please try again.'),
    }
  }
}

export const createGroup = createServerFn({ method: 'POST' })
  .validator((data: unknown) => parseValidatedInput(createGroupRequestSchema, data))
  .handler(async ({ data }) => createGroupFromForm(data))
