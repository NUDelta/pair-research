import { createServerFn } from '@tanstack/react-start'

export const acceptGroupInvitation = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'object' || data === null || !('groupId' in data)) {
      throw new Error('Group ID is required')
    }

    return { groupId: String(data.groupId) }
  })
  .handler(async ({ data }): Promise<ActionResponse> => {
    const { groupId } = data

    try {
      const { getPrismaClient } = await import('@/shared/server/prisma')
      const prisma = await getPrismaClient()
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()

      const invitedMember = await prisma.group_member.findFirst({
        where: {
          user_id: user.id,
          group_id: groupId,
        },
        select: {
          id: true,
          group_id: true,
          is_pending: true,
          group: {
            select: {
              name: true,
            },
          },
        },
      })

      if (!invitedMember) {
        return {
          success: false,
          message: 'You are not actually invited to this group',
        }
      }
      if (!invitedMember.is_pending) {
        return {
          success: false,
          message: 'You have already accepted the invitation',
        }
      }

      const result = await prisma.group_member.update({
        where: { id: invitedMember.id },
        data: {
          is_pending: false,
          joined_at: new Date(),
        },
      })

      if (result.is_pending) {
        return {
          success: false,
          message: `Failed to accept the invitation to ${invitedMember.group.name}`,
        }
      }

      return {
        success: true,
        message: `You have accepted the invitation to ${invitedMember.group.name}`,
      }
    }
    catch (error_) {
      console.error('Error accepting group invitation:', error_)
      return {
        success: false,
        message: 'Failed to accept the invitation',
      }
    }
  })
