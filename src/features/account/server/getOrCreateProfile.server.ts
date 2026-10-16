import { getAuthProfileSnapshot } from '@/features/auth/lib/authProfile'
import { getUser } from '@/shared/supabase/server'

/** Creates the profile atomically and backfills a missing name without replacing user edits. */
export async function loadOrCreateProfile(): Promise<{
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
}> {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  const prisma = await getPrismaClient()
  const user = await getUser()
  const email = user.email?.trim()
  if (email === undefined || email === '') {
    throw new Error('User email is required')
  }

  const metadata = getAuthProfileSnapshot(user)
  const select = { full_name: true, avatar_url: true } as const
  let profile = await prisma.profile.findUnique({ where: { id: user.id }, select })
  if (profile === null) {
    // ON CONFLICT avoids duplicate creation when concurrent requests both see no profile.
    await prisma.profile.createMany({
      data: { id: user.id, email, ...metadata },
      skipDuplicates: true,
    })
    profile = await prisma.profile.findUniqueOrThrow({ where: { id: user.id }, select })
  }

  if (profile.full_name === null && metadata.full_name !== null) {
    await prisma.profile.updateMany({
      where: { id: user.id, full_name: null },
      data: { full_name: metadata.full_name },
    })
    profile = await prisma.profile.findUniqueOrThrow({ where: { id: user.id }, select })
  }

  return { ...profile, id: user.id, email }
}

export const createProfileWithName = async (
  id: string,
  email: string,
  fullName?: string,
) => {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  const prisma = await getPrismaClient()
  await prisma.profile.createMany({
    data: { id, email: email.trim(), full_name: fullName?.trim() },
    skipDuplicates: true,
  })
}
