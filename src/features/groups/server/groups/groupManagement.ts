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

export interface InviteServiceRoleSupabase {
  auth: {
    admin: {
      inviteUserByEmail: (email: string) => Promise<{
        data: { user: User | null }
        error: { message?: string, code?: string } | null
      }>
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
  deliveryStatus: 'existing' | 'sent' | 'unknown'
}

export interface EnsuredInviteAuthUser {
  user: {
    id: string
    email: string
  }
  serviceRoleSupabase: InviteServiceRoleSupabase
  invitedNewUser: boolean
  deliveryStatus: 'existing' | 'sent' | 'unknown'
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

export async function ensureProfileForInvite(
  email: string,
  db?: InviteProfileDb,
  providedClient?: InviteServiceRoleSupabase,
): Promise<EnsuredInviteProfile> {
  const profileDb = db ?? await getProfileInviteDb()
  const normalizedEmail = email.trim().toLowerCase()
  const ensuredAuthUser = await ensureAuthUserForInvite(normalizedEmail, providedClient)
  const createdProfile = await upsertInviteProfile(profileDb, ensuredAuthUser.user)

  return {
    profile: createdProfile,
    invitedNewUser: ensuredAuthUser.invitedNewUser,
    deliveryStatus: ensuredAuthUser.deliveryStatus,
  }
}

export async function ensureAuthUserForInvite(
  email: string,
  providedClient?: InviteServiceRoleSupabase,
  preloadedAuthUser?: User | null,
): Promise<EnsuredInviteAuthUser> {
  const normalizedEmail = email.trim().toLowerCase()
  const serviceRoleSupabase = providedClient ?? await getInviteServiceRoleClient()
  const existingAuthUser = preloadedAuthUser === undefined
    ? await findUniqueAuthUserByEmail(serviceRoleSupabase, normalizedEmail)
    : preloadedAuthUser
  if (existingAuthUser !== null) {
    return {
      user: {
        id: existingAuthUser.id,
        email: normalizedEmail,
      },
      serviceRoleSupabase,
      invitedNewUser: false,
      deliveryStatus: 'existing',
    }
  }

  const { data, error } = await serviceRoleSupabase.auth.admin.inviteUserByEmail(normalizedEmail)
  if (error === null && data.user !== null) {
    return {
      user: {
        id: data.user.id,
        email: normalizedEmail,
      },
      serviceRoleSupabase,
      invitedNewUser: true,
      deliveryStatus: 'sent',
    }
  }

  // The provider may create the user and lose the response. A unique reread
  // makes retries idempotent without ever selecting identity from profile.email.
  const recoveredAuthUser = await findUniqueAuthUserByEmail(serviceRoleSupabase, normalizedEmail)
  if (recoveredAuthUser !== null) {
    return {
      user: {
        id: recoveredAuthUser.id,
        email: normalizedEmail,
      },
      serviceRoleSupabase,
      invitedNewUser: true,
      deliveryStatus: 'unknown',
    }
  }

  throw new Error('Failed to provision the invited user account.')
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

export async function findUniqueAuthUserByEmail(serviceRoleSupabase: InviteServiceRoleSupabase, email: string) {
  const normalizedEmail = email.trim().toLowerCase()
  return (await findUniqueAuthUsersByEmail(serviceRoleSupabase, [normalizedEmail])).get(normalizedEmail) ?? null
}

export async function findUniqueAuthUsersByEmail(
  serviceRoleSupabase: InviteServiceRoleSupabase,
  emails: string[],
): Promise<Map<string, User>> {
  const normalizedEmails = new Set(emails.map(email => email.trim().toLowerCase()))
  const matchedUsers = new Map<string, User>()

  if (normalizedEmails.size === 0) {
    return matchedUsers
  }

  for (let page = 1; ; page += 1) {
    const { data, error } = await serviceRoleSupabase.auth.admin.listUsers({
      page,
      perPage: AUTH_USER_LIST_PAGE_SIZE,
    })

    if (error !== null) {
      throw new Error('Failed to resolve the invited identity from Supabase Auth.')
    }

    for (const user of data.users) {
      const normalizedUserEmail = user.email?.trim().toLowerCase()
      if (normalizedUserEmail === undefined || !normalizedEmails.has(normalizedUserEmail)) {
        continue
      }

      if (matchedUsers.has(normalizedUserEmail)) {
        throw createUserSafeActionError('An invited email matches multiple Auth identities. Resolve the identity conflict before inviting it.')
      }
      matchedUsers.set(normalizedUserEmail, user)
    }

    if (data.users.length < AUTH_USER_LIST_PAGE_SIZE) {
      break
    }
  }

  return matchedUsers
}

export async function getInviteServiceRoleClient(): Promise<InviteServiceRoleSupabase> {
  const { createServiceRoleSupabase } = await import('@/shared/server/supabase/serviceRole')
  return await createServiceRoleSupabase() as InviteServiceRoleSupabase
}

async function getProfileInviteDb() {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  return getPrismaClient()
}
