import { createServerFn } from '@tanstack/react-start'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { groupSettingsParamsSchema } from '../../schemas/groupManagement'
import { findManagedGroup } from './groupManagement'

export const getGroupSettings = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => parseValidatedInput(groupSettingsParamsSchema, data))
  .handler(async ({ data }) => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const managementContext = await findManagedGroup(user.id, data.groupId)

      if (managementContext === null) {
        return null
      }

      const { prisma, group } = managementContext

      const [roles, members] = await Promise.all([
        prisma.group_role.findMany({
          where: {
            group_id: data.groupId,
          },
          orderBy: {
            id: 'asc',
          },
          select: {
            id: true,
            title: true,
          },
        }),
        prisma.group_member.findMany({
          where: {
            group_id: data.groupId,
          },
          orderBy: [
            { permission: 'asc' },
            { is_pending: 'asc' },
            { joined_at: 'asc' },
          ],
          select: {
            user_id: true,
            permission: true,
            is_pending: true,
            joined_at: true,
            group_role: {
              select: {
                id: true,
                title: true,
              },
            },
            profile: {
              select: {
                full_name: true,
                avatar_url: true,
                email: true,
              },
            },
          },
        }),
      ])

      return {
        group: {
          id: group.id,
          name: group.name,
          description: group.description,
          creatorId: group.creator_id,
          activePairingId: group.active_pairing_id,
        },
        currentUserId: user.id,
        currentUserPermission: managementContext.actorPermission,
        roles: roles.map(role => ({
          id: role.id.toString(),
          title: role.title,
        })),
        members: members.map(member => ({
          userId: member.user_id,
          fullName: member.profile.full_name,
          avatarUrl: member.profile.avatar_url,
          email: member.profile.email,
          roleId: member.group_role.id.toString(),
          roleTitle: member.group_role.title,
          permission: member.permission,
          isPending: member.is_pending,
          joinedAt: member.joined_at.toISOString(),
          isCreator: member.user_id === group.creator_id,
        })),
      }
    }
    catch (error) {
      console.error('[GET_GROUP_SETTINGS]', error)
      return null
    }
  })
