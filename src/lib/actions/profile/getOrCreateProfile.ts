import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@/utils/supabase/server'

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
  const { prisma } = await import('@/lib/prismaClient')
  const user = await getUser()

  const {
    id,
    email,
    user_metadata: {
      full_name: fullName,
      avatar_url: avatarUrl,
    },
  } = user

  const existing = await prisma.profile.findUnique({
    where: { id },
    select: { full_name: true, avatar_url: true },
  })

  const avatarNeedsUpdate = existing?.avatar_url === null && avatarUrl !== null
  const fullNameNeedsUpdate = existing?.full_name === null && fullName !== null

  if (existing && (avatarNeedsUpdate || fullNameNeedsUpdate)) {
    const updateData: Record<string, unknown> = {}
    if (avatarNeedsUpdate) {
      updateData.avatar_url = avatarUrl
    }
    if (fullNameNeedsUpdate) {
      updateData.full_name = fullName
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
      email: email?.trim() as string,
    }
  }

  if (existing) {
    return {
      full_name: existing.full_name,
      avatar_url: existing.avatar_url,
      id,
      email: email?.trim() as string,
    }
  }

  const created = await prisma.profile.create({
    data: {
      id,
      email: email?.trim() as string,
      full_name: fullName as string,
      avatar_url: avatarUrl as string,
    },
    select: { full_name: true, avatar_url: true },
  })

  return {
    full_name: created.full_name,
    avatar_url: created.avatar_url,
    id,
    email: email?.trim() as string,
  }
})

export const createProfileWithName = async (
  id: string,
  email: string,
  fullName?: string,
) => {
  const { prisma } = await import('@/lib/prismaClient')
  await prisma.profile.create({
    data: {
      id,
      email: email.trim(),
      full_name: fullName?.trim(),
    },
  })
}
