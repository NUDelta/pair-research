import type { GroupPermission } from '@/features/groups/lib/groupPermissions'
import { hasGroupManagementAccess } from '@/features/groups/lib/groupPermissions'

const SERIALIZABLE_RETRY_LIMIT = 3

interface GroupMembershipReader {
  group_member: {
    findFirst: (args: {
      where: {
        group_id: string
        user_id: string
        is_pending: false
      }
      select: {
        permission: true
      }
    }) => Promise<{ permission: GroupPermission } | null>
  }
}

interface InviteProfileDb {
  profile: {
    findFirst: (args: {
      where: {
        email: string
      }
      select: {
        id: true
        email: true
      }
    }) => Promise<{ id: string, email: string } | null>
    create: (args: {
      data: {
        id: string
        email: string
      }
      select: {
        id: true
        email: true
      }
    }) => Promise<{ id: string, email: string }>
  }
}

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

export async function ensureCurrentGroupManager(
  db: GroupMembershipReader,
  userId: string,
  groupId: string,
  message: string,
) {
  const currentMembership = await db.group_member.findFirst({
    where: {
      group_id: groupId,
      user_id: userId,
      is_pending: false,
    },
    select: {
      permission: true,
    },
  })

  if (currentMembership === null || !hasGroupManagementAccess(currentMembership.permission)) {
    throw new Error(message)
  }

  return currentMembership.permission
}

function isPrismaSerializationConflict(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2034'
}

export async function ensureProfileForInvite(email: string, db?: InviteProfileDb) {
  const profileDb = db ?? await getProfileInviteDb()
  const normalizedEmail = email.trim().toLowerCase()

  const existingProfile = await profileDb.profile.findFirst({
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

  const createdProfile = await profileDb.profile.create({
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

async function getProfileInviteDb() {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  return getPrismaClient()
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
