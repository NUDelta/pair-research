import type { PrismaClient } from './types'
import type { GroupPermission } from '@/features/groups/lib/groupPermissions'

export async function getPrisma(): Promise<PrismaClient> {
  const { getPrismaClient } = await import('@/shared/server/prisma')

  return getPrismaClient()
}

export async function getMembership(
  prisma: PrismaClient,
  groupId: string,
  userId: string,
): Promise<{ permission: GroupPermission } | null> {
  return prisma.group_member.findFirst({
    where: {
      group_id: groupId,
      user_id: userId,
      is_pending: false,
    },
    select: {
      permission: true,
    },
  })
}
