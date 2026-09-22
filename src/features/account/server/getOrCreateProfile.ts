import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@/shared/supabase/server'

/**
 * Get or create a profile by uid. Optionally upload and store avatar.
 * @returns An object with full_name and avatar_url
 */
export const getOrCreateProfile = createServerFn({ method: 'GET' }).handler(async (): Promise<{
  full_name: string | null
  avatar_url: string | null
  id: string
  email: string
}> => {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  const prisma = await getPrismaClient()
  const user = await getUser()

  const {
    id,
    email,
    user_metadata: {
      full_name: fullName,
      avatar_url: avatarUrl,
    },
  } = user

  const normalizedEmail = email?.trim().toLowerCase()
  if (normalizedEmail === undefined || normalizedEmail.length === 0) {
    throw new Error('Authenticated account is missing an email address')
  }

  const existing = await prisma.profile.findUnique({
    where: { id },
    select: { full_name: true, avatar_url: true, email: true },
  })

  const fullNameNeedsUpdate = existing?.full_name === null && fullName !== null
  const emailNeedsUpdate = existing !== null && existing.email !== normalizedEmail

  if (existing && (fullNameNeedsUpdate || emailNeedsUpdate)) {
    const updateData: Record<string, unknown> = {}
    if (fullNameNeedsUpdate) {
      updateData.full_name = fullName
    }
    if (emailNeedsUpdate) {
      updateData.email = normalizedEmail
    }

    const updatedUser = await prisma.profile.update({
      where: { id },
      data: updateData,
      select: { full_name: true, avatar_url: true },
    })
    return {
      full_name: updatedUser.full_name,
      avatar_url: updatedUser.avatar_url,
      id,
      email: normalizedEmail,
    }
  }

  if (existing) {
    return {
      full_name: existing.full_name,
      avatar_url: existing.avatar_url,
      id,
      email: normalizedEmail,
    }
  }

  const created = await prisma.profile.create({
    data: {
      id,
      email: normalizedEmail,
      full_name: fullName as string,
      avatar_url: avatarUrl as string,
    },
    select: { full_name: true, avatar_url: true },
  })

  return {
    full_name: created.full_name,
    avatar_url: created.avatar_url,
    id,
    email: normalizedEmail,
  }
})

export const createProfileWithName = async (
  id: string,
  email: string,
  fullName?: string,
) => {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  const prisma = await getPrismaClient()
  await prisma.profile.create({
    data: {
      id,
      email: email.trim(),
      full_name: fullName?.trim(),
    },
  })
}
