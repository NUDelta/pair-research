import { createServerFn } from '@tanstack/react-start'

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
      const { getPrismaClient } = await import('@/shared/server/prisma')
      const prisma = await getPrismaClient()
      const { getUser } = await import('@/shared/supabase/server')
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
              pairing_group_active_pairing_idTopairing: {
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

      const activePairing = membership.group.pairing_group_active_pairing_idTopairing
      const latestPairing = await prisma.pairing.findFirst({
        where: {
          group_id: groupId,
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          created_at: true,
        },
      })
      const activeRoundPairs = activePairing?.pair.map(pair => ({
        id: String(pair.id),
        members: [
          {
            userId: pair.first_user,
            fullName: pair.profile_pair_first_userToprofile.full_name,
            avatarUrl: pair.profile_pair_first_userToprofile.avatar_url,
            taskDescription: activePairing.task.find(task => task.user_id === pair.first_user)?.description ?? null,
          },
          {
            userId: pair.second_user,
            fullName: pair.profile_pair_second_userToprofile.full_name,
            avatarUrl: pair.profile_pair_second_userToprofile.avatar_url,
            taskDescription: activePairing.task.find(task => task.user_id === pair.second_user)?.description ?? null,
          },
        ],
      })) ?? []
      const groupInfo = {
        id: groupId,
        name: membership.group.name,
        description: membership.group.description,
        activePairingId: membership.group.active_pairing_id,
        activePairingCreatedAt: activePairing?.created_at.toISOString() ?? null,
        activePairCount: activePairing?.pair.length ?? 0,
        activeRoundPairs,
        lastPairingCreatedAt: latestPairing?.created_at.toISOString() ?? null,
        userId,
        fullName: membership.profile.full_name,
        avatarUrl: membership.profile.avatar_url,
        isAdmin: membership.is_admin,
        hasActivePairing: activePairing !== null,
        joinedAt: membership.joined_at.toISOString(),
      }

      let currentUserActivePairingTaskWithProfile: CurrentUserActivePair | null = null

      if (activePairing?.id !== undefined) {
        const currentUserActivePairing = activePairing.pair.find(pair =>
          pair.first_user === userId || pair.second_user === userId,
        )

        if (currentUserActivePairing !== undefined) {
          const helpeeUserId = currentUserActivePairing?.first_user === userId
            ? currentUserActivePairing?.second_user
            : currentUserActivePairing?.first_user

          const helpeePair = activePairing.pair.find(pair =>
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

          const helperPair = activePairing.pair.find(pair =>
            pair.first_user === helperUserId || pair.second_user === helperUserId,
          )

          const helperUserProfile = helperPair
            ? helperPair.first_user === helperUserId
              ? helperPair.profile_pair_first_userToprofile
              : helperPair.profile_pair_second_userToprofile
            : undefined

          const helpeeTask = activePairing.task.find(task =>
            task.user_id === helpeeUserId,
          )
          const helperTask = activePairing.task.find(task =>
            task.user_id === helperUserId,
          )

          currentUserActivePairingTaskWithProfile = {
            id: String(activePairing.id),
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
          delete_pending: {
            not: true,
          },
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

      const activeTaskIds = tasksWithHelpCapacity.map(task => task.id)
      const poolRatingRows = activeTaskIds.length > 0
        ? await prisma.task_help_capacity.findMany({
            where: {
              task_id: {
                in: activeTaskIds,
              },
            },
            select: {
              id: true,
              user_id: true,
              task_id: true,
            },
          })
        : []

      const ratingProgressByUserId = poolRatingRows.reduce<Record<string, {
        count: number
        completionOrder: number | null
      }>>((acc, rating) => {
        // task_help_capacity rows are immutable per (task, user), so the largest
        // row id for a user's active-pool ratings reflects their most recently
        // completed new rating without being affected by later edits.
        const ratingId = Number(rating.id)
        const current = acc[rating.user_id] ?? {
          count: 0,
          completionOrder: null,
        }

        acc[rating.user_id] = {
          count: current.count + 1,
          completionOrder: current.completionOrder === null
            ? ratingId
            : Math.max(current.completionOrder, ratingId),
        }

        return acc
      }, {})

      const tasks = tasksWithHelpCapacity.map((task) => {
        const progress = ratingProgressByUserId[task.user_id]

        return {
          id: String(task.id),
          description: task.description,
          userId: task.user_id,
          fullName: task.profile.full_name,
          avatarUrl: task.profile.avatar_url,
          helpCapacity: task.task_help_capacity[0]?.help_capacity ?? null,
          ratingsCompletedCount: progress?.count ?? 0,
          ratingsCompletionOrder: progress?.completionOrder ?? null,
        }
      })

      return { groupInfo, tasks, currentUserActivePairingTaskWithProfile }
    }
    catch (error_) {
      console.error('Error fetching group:', error_)
      return null
    }
  })
