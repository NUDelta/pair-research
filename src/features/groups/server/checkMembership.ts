export const checkMembership = async (
  userId: string,
  groupId: string,
): Promise<boolean> => {
  const { getPrismaClient } = await import('@/shared/server/prisma')
  const prisma = await getPrismaClient()
  const membership = await prisma.group_member.findFirst({
    where: {
      user_id: userId,
      group_id: groupId,
      is_pending: false,
    },
  })

  return membership !== null
}
