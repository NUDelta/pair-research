'use server'

import type { GroupValues } from '@/lib/validators/group'
import type { User } from '@supabase/supabase-js'
import { prisma } from '@/lib/prismaClient'
import { groupSchema } from '@/lib/validators/group'
import { getUser } from '@/utils/supabase/server'
import { createServiceRoleSupabase } from '@/utils/supabase/serviceRole'
import { z } from 'zod'

export const createGroup = async (
  data: GroupValues,
): Promise<ActionResponse> => {
  try {
    const user = await getUser()
    const {
      groupName,
      groupDescription,
      roles,
      assignedRole,
      members,
    } = await groupSchema.parseAsync(data)

    if (!roles.some(role => role.title === assignedRole)) {
      throw new Error('Assigned role must be one of the roles')
    }

    const memberEmailTitlesMap = members.reduce((acc, member) => {
      acc[member.email] = member.title
      return acc
    }, {} as Record<string, string>)

    // 1. Create group
    const group = await prisma.group.create({
      data: {
        name: groupName,
        description: groupDescription ?? null,
        creator_id: user.id,
        active: true,
        created_at: new Date(),
      },
    })

    // 2. Create group roles — use createMany + fetch back
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

    const createdRolesMap = createdRoles.reduce((acc, role) => {
      acc[role.title.trim()] = role
      return acc
    }, {} as Record<string, { id: bigint }>)

    if (createdRoles.length === 0) {
      throw new Error('Roles creation failed')
    }

    const creatorRole = createdRolesMap[assignedRole.trim()]

    if (creatorRole === undefined) {
      throw new Error('Creator role not found')
    }

    // 3. Find existing users
    const existingUsers = await prisma.profile.findMany({
      where: {
        email: {
          in: members.map(m => m.email),
        },
      },
      select: {
        id: true,
        email: true,
      },
    })

    // 4. Create new users
    const newUsers = members.filter(
      m => !existingUsers.some(u => u.email === m.email),
    )

    const serviceRoleSupabase = await createServiceRoleSupabase()
    const userCreations = await Promise.allSettled(
      newUsers.map(async ({ email }) => {
        const {
          data: { user },
          error,
        } = await serviceRoleSupabase.auth.admin.createUser({ email })
        return { user, error, email } // attach email for traceability
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

    // 5. Create group members
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
    if (error_ instanceof z.ZodError) {
      return {
        success: false,
        message: error_.issues.map(issue => issue.message).join('\n'),
      }
    }

    return {
      success: false,
      message: 'Failed to create group. Please try again.',
    }
  }
}
