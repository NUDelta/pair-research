import type { PrismaClient } from './types'

export async function getPrisma(): Promise<PrismaClient> {
  const { getPrismaClient } = await import('@/shared/server/prisma')

  return getPrismaClient()
}

export async function getMembership(
  prisma: PrismaClient,
  groupId: string,
  userId: string,
): Promise<{ is_admin: boolean } | null> {
  return prisma.group_member.findFirst({
    where: {
      group_id: groupId,
      user_id: userId,
      is_pending: false,
    },
    select: {
      is_admin: true,
    },
  })
}
