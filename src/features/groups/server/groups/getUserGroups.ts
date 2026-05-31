import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { hasGroupManagementAccess } from '@/features/groups/lib/groupPermissions'
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

    const managedGroupIds = memberships
      .filter(membership => hasGroupManagementAccess(membership.permission))
      .map(membership => membership.group.id)

    const managedGroupMembers = managedGroupIds.length > 0
      ? await prisma.group_member.findMany({
          where: {
            group_id: {
              in: managedGroupIds,
            },
          },
          include: {
            profile: true,
            group_role: true,
          },
        })
      : []

    const managedMembersByGroupId = new Map<string, typeof managedGroupMembers>()
    for (const member of managedGroupMembers) {
      const groupMembers = managedMembersByGroupId.get(member.group_id) ?? []
      groupMembers.push(member)
      managedMembersByGroupId.set(member.group_id, groupMembers)
    }

    const result = memberships.map((membership) => {
      const { group, group_role, permission, is_pending, joined_at } = membership

      const baseGroup = {
        id: group.id,
        groupName: group.name,
        groupDescription: group.description,
        role: group_role.title,
        permission,
        isPending: is_pending,
        joinedAt: joined_at.toISOString(),
      }

      if (!hasGroupManagementAccess(permission)) {
        return baseGroup
      }

      const members = managedMembersByGroupId.get(group.id) ?? []
      const groupMembers = members.map(m => ({
        id: m.profile.id,
        fullName: m.profile.full_name,
        avatarUrl: m.profile.avatar_url,
        email: m.profile.email,
        role: m.group_role.title,
        permission: m.permission,
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
