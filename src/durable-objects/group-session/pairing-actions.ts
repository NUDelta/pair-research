import type { GroupSessionRuntime } from './runtime'
import type { GroupSessionRequest, MakePairsResponse } from './types'
import { buildPairs } from '@/features/groups/lib/pairing'
import { getMembership, getPrisma } from './database'
import { buildPairingHistory } from './pairing-history'
import {
  getStoredRatings,
  getStoredTasks,
  pruneRatingsToActiveTasks,
  removeStoredTasks,
} from './storage'
import {
  ACTIVE_PAIRING_EXISTS_MESSAGE,
  POOL_CHANGED_MESSAGE,
} from './types'

export async function handleMakePairs(
  runtime: GroupSessionRuntime,
  request: GroupSessionRequest,
): Promise<MakePairsResponse> {
  try {
    const prisma = await getPrisma()
    const membership = await getMembership(prisma, request.groupId, request.userId)

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
      where: { id: request.groupId },
      select: {
        active_pairing_id: true,
      },
    })

    if (group === null) {
      return {
        success: false,
        message: 'Group not found',
      }
    }

    if (group.active_pairing_id !== null) {
      return {
        success: false,
        message: ACTIVE_PAIRING_EXISTS_MESSAGE,
      }
    }

    await runtime.ensureHydrated(request.groupId, prisma)
    const tasks = getStoredTasks(runtime.ctx)

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

    const ratings = getStoredRatings(runtime.ctx)
    const latestPairing = await prisma.pairing.findFirst({
      where: {
        group_id: request.groupId,
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
      id: task.id,
      description: task.description,
      userId: task.user_id,
      fullName: task.full_name,
    }))
    const pairingHelpCapacities = ratings.map(rating => ({
      taskId: rating.task_id,
      userId: rating.user_id,
      helpCapacity: rating.help_capacity,
    }))
    const pairingHistory = buildPairingHistory(pairingTasks, latestPairing?.pair ?? [])
    const pairs = buildPairs(pairingTasks, pairingHelpCapacities, pairingHistory)

    if (pairs.length === 0) {
      return {
        success: false,
        message: 'Not enough compatible tasks were available to make pairs',
      }
    }

    const pairedTaskIds = pairs.flatMap(pair => pair.taskIds)
    const pairedTaskBigIds = pairedTaskIds.map(taskId => BigInt(taskId))

    const pairing = await prisma.$transaction(async (tx) => {
      const nextPairing = await tx.pairing.create({
        data: {
          group_id: request.groupId,
        },
      })

      const activatedGroup = await tx.group.updateMany({
        where: {
          id: request.groupId,
          active_pairing_id: null,
        },
        data: { active_pairing_id: nextPairing.id },
      })

      if (activatedGroup.count === 0) {
        throw new Error(ACTIVE_PAIRING_EXISTS_MESSAGE)
      }

      const pairedTasks = await tx.task.updateMany({
        where: {
          group_id: request.groupId,
          id: {
            in: pairedTaskBigIds,
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

      if (pairedTasks.count !== pairedTaskBigIds.length) {
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

    removeStoredTasks(runtime.ctx, pairedTaskIds)
    pruneRatingsToActiveTasks(runtime.ctx)
    runtime.broadcast({
      type: 'pairing:created',
      pairingId: pairing.id,
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

    console.error('Error making pairs through group session:', error)
    return { success: false, message: 'Failed to make pairs' }
  }
}
