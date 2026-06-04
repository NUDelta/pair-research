import type { User } from '@supabase/supabase-js'
import type { GroupPermission } from '@/features/groups/lib/groupPermissions'
import { hasGroupManagementAccess } from '@/features/groups/lib/groupPermissions'
import { createUserSafeActionError } from '../actionErrors'

const SERIALIZABLE_RETRY_LIMIT = 3
const AUTH_USER_LIST_PAGE_SIZE = 1000

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
    upsert: (args: {
      where: {
        id: string
      }
      update: {
        email: string
      }
      create: {
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

interface InviteServiceRoleSupabase {
  auth: {
    admin: {
      createUser: (args: { email: string }) => Promise<{
        data: { user: User | null }
        error: { message?: string } | null
      }>
      inviteUserByEmail: (email: string) => Promise<unknown>
      listUsers: (args: { page: number, perPage: number }) => Promise<{
        data: { users: User[] }
        error: { message?: string } | null
      }>
    }
  }
}

export interface EnsuredInviteProfile {
  profile: {
    id: string
    email: string
  }
  invitedNewUser: boolean
  serviceRoleSupabase?: InviteServiceRoleSupabase
}

export interface EnsuredInviteAuthUser {
  user: {
    id: string
    email: string
  }
  serviceRoleSupabase: InviteServiceRoleSupabase
}

interface InviteProfileWriter {
  profile: {
    upsert: (args: {
      where: {
        id: string
      }
      update: {
        email: string
      }
      create: {
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
    throw createUserSafeActionError(message)
  }

  return currentMembership.permission
}

function isPrismaSerializationConflict(error: unknown) {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2034'
}

export async function ensureProfileForInvite(email: string, db?: InviteProfileDb): Promise<EnsuredInviteProfile> {
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

  const ensuredAuthUser = await ensureAuthUserForInvite(normalizedEmail)
  const createdProfile = await upsertInviteProfile(profileDb, ensuredAuthUser.user)

  return {
    profile: createdProfile,
    invitedNewUser: true,
    serviceRoleSupabase: ensuredAuthUser.serviceRoleSupabase,
  }
}

export async function ensureAuthUserForInvite(email: string): Promise<EnsuredInviteAuthUser> {
  const normalizedEmail = email.trim().toLowerCase()
  const { createServiceRoleSupabase } = await import('@/shared/server/supabase/serviceRole')
  const serviceRoleSupabase = await createServiceRoleSupabase()
  const {
    data: { user },
    error,
  } = await serviceRoleSupabase.auth.admin.createUser({ email: normalizedEmail })

  if (error === null && user !== null) {
    return {
      user: {
        id: user.id,
        email: normalizedEmail,
      },
      serviceRoleSupabase,
    }
  }

  const existingAuthUser = await findAuthUserByEmail(serviceRoleSupabase, normalizedEmail)
  if (existingAuthUser !== null) {
    return {
      user: {
        id: existingAuthUser.id,
        email: normalizedEmail,
      },
      serviceRoleSupabase,
    }
  }

  throw new Error('Failed to create the invited user account.')
}

export async function upsertInviteProfile(db: InviteProfileWriter, profile: { id: string, email: string }) {
  return db.profile.upsert({
    where: {
      id: profile.id,
    },
    update: {
      email: profile.email,
    },
    create: {
      id: profile.id,
      email: profile.email,
    },
    select: {
      id: true,
      email: true,
    },
  })
}

async function findAuthUserByEmail(serviceRoleSupabase: InviteServiceRoleSupabase, email: string) {
  const normalizedEmail = email.trim().toLowerCase()

  for (let page = 1; ; page += 1) {
    const { data, error } = await serviceRoleSupabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USER_LIST_PAGE_SIZE,
    })

    if (error !== null) {
      return null
    }

    const matchedUser = data.users.find(user => user.email?.trim().toLowerCase() === normalizedEmail)
    if (matchedUser !== undefined) {
      return matchedUser
    }

    if (data.users.length < AUTH_USER_LIST_PAGE_SIZE) {
      return null
    }
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
