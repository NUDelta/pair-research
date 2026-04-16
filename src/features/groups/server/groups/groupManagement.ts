export async function findManagedGroup(userId: string, groupId: string) {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  const prisma = await getPrismaClient()

  const membership = await prisma.group_member.findFirst({
    where: {
      group_id: groupId,
      user_id: userId,
      is_pending: false,
    },
    select: {
      is_admin: true,
      group: {
        select: {
          id: true,
          name: true,
          description: true,
          creator_id: true,
          active_pairing_id: true,
        },
      },
    },
  })

  if (membership === null || !membership.is_admin) {
    return null
  }

  return {
    prisma,
    group: membership.group,
  }
}

export async function ensureProfileForInvite(email: string) {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  const prisma = await getPrismaClient()
  const normalizedEmail = email.trim().toLowerCase()

  const existingProfile = await prisma.profile.findFirst({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      email: true,
    },
  })

  if (existingProfile !== null) {
    return {
      profile: existingProfile,
      invitedNewUser: false,
    }
  }

  const { createServiceRoleSupabase } = await import('@/shared/server/supabase/serviceRole')
  const serviceRoleSupabase = await createServiceRoleSupabase()
  const {
    data: { user },
    error,
  } = await serviceRoleSupabase.auth.admin.createUser({ email: normalizedEmail })

  if (error !== null || user === null) {
    throw new Error(error?.message ?? 'Failed to create the invited user account.')
  }

  const createdProfile = await prisma.profile.create({
    data: {
      id: user.id,
      email: normalizedEmail,
    },
    select: {
      id: true,
      email: true,
    },
  })

  return {
    profile: createdProfile,
    invitedNewUser: true,
    serviceRoleSupabase,
  }
}

export async function inviteCreatedUserByEmail(
  serviceRoleSupabase: {
    auth: {
      admin: {
        inviteUserByEmail: (email: string) => Promise<unknown>
      }
    }
  },
  email: string,
) {
  try {
    await serviceRoleSupabase.auth.admin.inviteUserByEmail(email)
  }
  catch (error) {
    console.warn('[GROUP_MEMBER_INVITE_FAILED]', { email, error })
  }
}
