import { hasGroupManagementAccess } from '@/features/groups/lib/groupPermissions'

const SERIALIZABLE_RETRY_LIMIT = 3

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
      permission: true,
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

  if (membership === null || !hasGroupManagementAccess(membership.permission)) {
    return null
  }

  return {
    prisma,
    group: membership.group,
    actorPermission: membership.permission,
  }
}

export async function withSerializableRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown

  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await operation()
    }
    catch (error) {
      lastError = error
      if (!isPrismaSerializationConflict(error)) {
        throw error
      }
    }
  }

  throw lastError
}

function isPrismaSerializationConflict(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2034'
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
