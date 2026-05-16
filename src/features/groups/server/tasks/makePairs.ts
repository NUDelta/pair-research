import type { PairingHistory } from '@/features/groups/lib/pairing'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { buildPairs } from '@/features/groups/lib/pairing'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'

interface MakePairsResponse {
  success: boolean
  message: string
  data?: {
    pairingId?: string
    pairs?: Array<{
      firstUser: string
      secondUser: string
      affinity: number
    }>
  }
}

const makePairsInputSchema = z.object({
  groupId: z.string(),
})
const ACTIVE_PAIRING_EXISTS_MESSAGE = 'This group already has an active pairing. Reset the pool before making new pairs.'
const POOL_CHANGED_MESSAGE = 'The pool changed before pairs could be created. Please review the current pool and try again.'

export const makePairs = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(makePairsInputSchema, data))
  .handler(async ({ data }): Promise<MakePairsResponse> => {
    const { groupId } = data

    try {
      const { getPrismaClient } = await import('@/shared/server/prisma')
      const prisma = await getPrismaClient()
      const { getUser } = await import('@/shared/supabase/server')
      const user = await getUser()
      const membership = await prisma.group_member.findFirst({
        where: {
          group_id: groupId,
          user_id: user.id,
          is_pending: false,
        },
        select: {
          is_admin: true,
        },
      })

      if (membership === null) {
        return {
          success: false,
          message: 'You are not a member in this group',
        }
      }

      if (!membership.is_admin) {
        return {
          success: false,
          message: 'Only group admins can make pairs',
        }
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: {
          pairing_group_active_pairing_idTopairing: {
            select: {
              id: true,
            },
          },
        },
      })

      if (group === null) {
        return {
          success: false,
          message: 'Group not found',
        }
      }

      if (group.pairing_group_active_pairing_idTopairing !== null) {
        return {
          success: false,
          message: ACTIVE_PAIRING_EXISTS_MESSAGE,
        }
      }

      const tasks = await prisma.task.findMany({
        where: {
          group_id: groupId,
          pairing_id: null,
          delete_pending: {
            not: true,
          },
        },
        include: {
          profile: true,
        },
      })

      if (tasks.length === 0) {
        return {
          success: false,
          message: 'The pool is empty. Add at least two active tasks before making pairs',
        }
      }

      if (tasks.length < 2) {
        return {
          success: false,
          message: 'At least two active tasks are required to make pairs',
        }
      }

      const helpCapacities = await prisma.task_help_capacity.findMany({
        where: {
          task: {
            group_id: groupId,
            pairing_id: null,
            delete_pending: {
              not: true,
            },
          },
        },
      })
      const latestPairing = await prisma.pairing.findFirst({
        where: {
          group_id: groupId,
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          pair: {
            select: {
              first_user: true,
              second_user: true,
            },
          },
        },
      })

      const pairingTasks = tasks.map(task => ({
        id: String(task.id),
        description: task.description,
        userId: task.user_id,
        fullName: task.profile.full_name,
      }))
      const pairingHelpCapacities = helpCapacities.map(capacity => ({
        taskId: String(capacity.task_id),
        userId: capacity.user_id,
        helpCapacity: capacity.help_capacity,
      }))
      const pairingHistory = buildPairingHistory(pairingTasks, latestPairing?.pair ?? [])
      const pairs = buildPairs(pairingTasks, pairingHelpCapacities, pairingHistory)

      if (pairs.length === 0) {
        return {
          success: false,
          message: 'Not enough compatible tasks were available to make pairs',
        }
      }

      const pairedTaskIds = pairs.flatMap(pair => pair.taskIds).map(taskId => BigInt(taskId))

      const pairing = await prisma.$transaction(async (tx) => {
        const nextPairing = await tx.pairing.create({
          data: {
            group_id: groupId,
          },
        })

        const activatedGroup = await tx.group.updateMany({
          where: {
            id: groupId,
            active_pairing_id: null,
          },
          data: { active_pairing_id: nextPairing.id },
        })

        if (activatedGroup.count === 0) {
          throw new Error(ACTIVE_PAIRING_EXISTS_MESSAGE)
        }

        const pairedTasks = await tx.task.updateMany({
          where: {
            group_id: groupId,
            id: {
              in: pairedTaskIds,
            },
            pairing_id: null,
            delete_pending: {
              not: true,
            },
          },
          data: {
            pairing_id: nextPairing.id,
          },
        })

        if (pairedTasks.count !== pairedTaskIds.length) {
          throw new Error(POOL_CHANGED_MESSAGE)
        }

        await tx.pair.createMany({
          data: pairs.map(pair => ({
            pairing_id: nextPairing.id,
            first_user: pair.firstUser,
            second_user: pair.secondUser,
          })),
        })

        await tx.affinity.createMany({
          data: pairs.flatMap(pair => [
            {
              pairing_id: nextPairing.id,
              helpee_id: pair.firstUser,
              helper_id: pair.secondUser,
              value: pair.affinity,
            },
            {
              pairing_id: nextPairing.id,
              helpee_id: pair.secondUser,
              helper_id: pair.firstUser,
              value: pair.affinity,
            },
          ]),
        })

        return nextPairing
      })

      return {
        success: true,
        message: 'Pairs created successfully',
        data: {
          pairingId: pairing.id,
          pairs: pairs.map(({ firstUser, secondUser, affinity }) => ({
            firstUser,
            secondUser,
            affinity,
          })),
        },
      }
    }
    catch (error) {
      if (error instanceof Error && error.message === ACTIVE_PAIRING_EXISTS_MESSAGE) {
        return { success: false, message: ACTIVE_PAIRING_EXISTS_MESSAGE }
      }

      if (error instanceof Error && error.message === POOL_CHANGED_MESSAGE) {
        return { success: false, message: POOL_CHANGED_MESSAGE }
      }

      console.error(error)
      return { success: false, message: 'Failed to make pairs' }
    }
  })

function buildPairingHistory(
  pairingTasks: Array<{ userId: string }>,
  previousPairs: Array<{ first_user: string, second_user: string }>,
): PairingHistory | undefined {
  if (previousPairs.length === 0) {
    return undefined
  }

  const currentUserIds = new Set(pairingTasks.map(task => task.userId))
  const normalizedPreviousPairs = previousPairs
    .map(pair => [pair.first_user, pair.second_user] as const)
    .filter(([firstUserId, secondUserId]) => currentUserIds.has(firstUserId) && currentUserIds.has(secondUserId))
  const pairedUserIds = new Set(normalizedPreviousPairs.flatMap(([firstUserId, secondUserId]) => [firstUserId, secondUserId]))
  const unmatchedCandidates = pairingTasks
    .map(task => task.userId)
    .filter(userId => !pairedUserIds.has(userId))

  return {
    previousPairs: normalizedPreviousPairs,
    previousUnmatchedUserId: pairingTasks.length % 2 === 1 && unmatchedCandidates.length === 1
      ? unmatchedCandidates[0]
      : null,
  }
}
