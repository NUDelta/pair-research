'use server'

import { prisma } from '@/lib/prismaClient'
import { getUser } from '@/utils/supabase/server'

export const acceptGroupInvitation = async (
  groupId: string,
): Promise<ActionResponse> => {
  try {
    const user = await getUser()

    // 1. Check if the user is actually beening invited or if already a member of this group
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

    // 2. Accept the invitation
    const restult = await prisma.group_member.update({
      where: { id: invitedMember.id },
      data: {
        is_pending: false,
        joined_at: new Date(),
      },
    })

    if (restult.is_pending) {
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
}
