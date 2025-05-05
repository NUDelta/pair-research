'use server'

import { prisma } from '@/lib/prismaClient'
import { getUser } from '@/utils/supabase/server'

export const getSingleGroup = async (groupId: string) => {
  try {
    const { id: userId } = await getUser()

    const membership = await prisma.group_member.findFirst({
      where: {
        group_id: groupId,
        user_id: userId,
        is_pending: false,
      },
      select: {
        is_admin: true,
        joined_at: true,
        group: {
          select: {
            name: true,
            description: true,
          },
        },
        profile: {
          select: {
            full_name: true,
            avatar_url: true,
          },
        },
      },
    })

    if (!membership) {
      throw new Error('User is not a member of this group')
    }

    const groupInfo = {
      id: groupId,
      name: membership.group.name,
      description: membership.group.description,
      userId,
      fullName: membership.profile.full_name,
      avatarUrl: membership.profile.avatar_url,
      isAdmin: membership.is_admin,
      joinedAt: membership.joined_at.toISOString(),
    }

    const tasksWithHelpCapacity = await prisma.task.findMany({
      where: {
        group_id: groupId,
        pairing_id: null,
      },
      select: {
        id: true,
        description: true,
        user_id: true,
        profile: {
          select: {
            full_name: true,
            avatar_url: true,
          },
        },
        task_help_capacity: {
          where: {
            user_id: userId,
          },
          select: {
            help_capacity: true,
          },
        },
      },
    })

    const tasks = tasksWithHelpCapacity.map(task => ({
      id: String(task.id),
      description: task.description,
      userId: task.user_id,
      fullName: task.profile.full_name,
      avatarUrl: task.profile.avatar_url,
      helpCapacity: task.task_help_capacity[0]?.help_capacity,
    }))

    return { groupInfo, tasks }
  }
  catch (error_) {
    console.error('Error fetching group:', error_)
    return null
  }
}
