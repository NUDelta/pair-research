import { createServerFn } from '@tanstack/react-start'
import { getUser } from '@/utils/supabase/server'

export const getSingleGroup = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'object' || data === null || !('groupId' in data)) {
      throw new Error('Group ID is required')
    }

    return { groupId: String(data.groupId) }
  })
  .handler(async ({ data }) => {
    const { groupId } = data

    try {
      const { prisma } = await import('@/lib/prismaClient')
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
              active_pairing_id: true,
              pairing: {
                select: {
                  id: true,
                  created_at: true,
                  pair: {
                    select: {
                      id: true,
                      first_user: true,
                      second_user: true,
                      profile_pair_first_userToprofile: {
                        select: {
                          full_name: true,
                          avatar_url: true,
                        },
                      },
                      profile_pair_second_userToprofile: {
                        select: {
                          full_name: true,
                          avatar_url: true,
                        },
                      },
                    },
                  },
                  task: {
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
                    },
                  },
                },
              },
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

      let currentUserActivePairingTaskWithProfile: CurrentUserActivePair | null = null

      if (membership.group.pairing[0]?.id !== null) {
        const currentUserActivePairing = membership.group.pairing[0]?.pair.find(pair =>
          pair.first_user === userId || pair.second_user === userId,
        )

        if (currentUserActivePairing !== undefined) {
          const helpeeUserId = currentUserActivePairing?.first_user === userId
            ? currentUserActivePairing?.second_user
            : currentUserActivePairing?.first_user

          const helpeePair = membership.group.pairing[0]?.pair.find(pair =>
            pair.first_user === helpeeUserId || pair.second_user === helpeeUserId,
          )

          const helpeeUserProfile = helpeePair
            ? helpeePair.first_user === helpeeUserId
              ? helpeePair.profile_pair_first_userToprofile
              : helpeePair.profile_pair_second_userToprofile
            : undefined

          const helperUserId = currentUserActivePairing?.first_user === userId
            ? currentUserActivePairing?.first_user
            : currentUserActivePairing?.second_user

          const helperPair = membership.group.pairing[0]?.pair.find(pair =>
            pair.first_user === helperUserId || pair.second_user === helperUserId,
          )

          const helperUserProfile = helperPair
            ? helperPair.first_user === helperUserId
              ? helperPair.profile_pair_first_userToprofile
              : helperPair.profile_pair_second_userToprofile
            : undefined

          const helpeeTask = membership.group.pairing[0]?.task.find(task =>
            task.user_id === helpeeUserId,
          )
          const helperTask = membership.group.pairing[0]?.task.find(task =>
            task.user_id === helperUserId,
          )

          currentUserActivePairingTaskWithProfile = {
            id: String(membership.group.pairing[0]?.id),
            helpeeId: helpeeUserId ?? '',
            helpeeFullName: helpeeUserProfile?.full_name ?? null,
            helpeeAvatarUrl: helpeeUserProfile?.avatar_url ?? null,
            helpeeTaskId: helpeeTask?.id !== undefined ? String(helpeeTask.id) : null,
            helpeeTaskDescription: helpeeTask?.description ?? null,
            helperId: helperUserId ?? '',
            helperFullName: helperUserProfile?.full_name ?? null,
            helperAvatarUrl: helperUserProfile?.avatar_url ?? null,
            helperTaskId: helperTask?.id !== undefined ? String(helperTask.id) : null,
            helperTaskDescription: helperTask?.description ?? null,
          }
        }
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

      return { groupInfo, tasks, currentUserActivePairingTaskWithProfile }
    }
    catch (error_) {
      console.error('Error fetching group:', error_)
      return null
    }
  })
