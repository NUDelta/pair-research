import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { groupsResponseSchema } from '@/features/groups/schemas/group'

export async function loadUserGroups() {
  try {
    const { getPrismaClient } = await import('@/shared/server/prisma')
    const prisma = await getPrismaClient()
    const { getUser } = await import('@/shared/supabase/server')
    const user = await getUser()
    const userId = user.id

    const memberships = await prisma.group_member.findMany({
      where: {
        user_id: userId,
      },
      include: {
        group: true,
        group_role: true,
      },
    })

    const adminGroupIds = memberships
      .filter(membership => membership.is_admin)
      .map(membership => membership.group.id)

    const adminGroupMembers = adminGroupIds.length > 0
      ? await prisma.group_member.findMany({
          where: {
            group_id: {
              in: adminGroupIds,
            },
          },
          include: {
            profile: true,
            group_role: true,
          },
        })
      : []

    const adminMembersByGroupId = new Map<string, typeof adminGroupMembers>()
    for (const member of adminGroupMembers) {
      const groupMembers = adminMembersByGroupId.get(member.group_id) ?? []
      groupMembers.push(member)
      adminMembersByGroupId.set(member.group_id, groupMembers)
    }

    const result = memberships.map((membership) => {
      const { group, group_role, is_admin, is_pending, joined_at } = membership

      const baseGroup = {
        id: group.id,
        groupName: group.name,
        groupDescription: group.description,
        role: group_role.title,
        isAdmin: is_admin,
        isPending: is_pending,
        joinedAt: joined_at.toISOString(),
      }

      if (!is_admin) {
        return baseGroup
      }

      const members = adminMembersByGroupId.get(group.id) ?? []
      const groupMembers = members.map(m => ({
        id: m.profile.id,
        fullName: m.profile.full_name,
        avatarUrl: m.profile.avatar_url,
        email: m.profile.email,
        role: m.group_role.title,
        isAdmin: m.is_admin,
        isPending: m.is_pending,
        joinedAt: m.joined_at.toISOString(),
      }))

      return {
        ...baseGroup,
        createdAt: group.created_at.toISOString(),
        groupMembers,
      }
    })

    return groupsResponseSchema.parse(result)
  }
  catch (error_) {
    if (error_ instanceof z.ZodError) {
      console.error('[GET_USER_GROUPS_ERROR-ZOD]', error_.issues)
    }

    console.error('[GET_USER_GROUPS_ERROR]', error_)
    throw error_
  }
}

export const getUserGroups = createServerFn({ method: 'GET' }).handler(async () => loadUserGroups())
