import type { MissingHelpCapacity } from '@/features/groups/lib/pairing'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { buildPairs, findMissingHelpCapacities } from '@/features/groups/lib/pairing'
import { parseValidatedInput } from '@/features/groups/server/parseValidatedInput'
import { getUser } from '@/shared/supabase/server'

interface MakePairsResponse {
  success: boolean
  message: string
  data?: {
    missingHelpCapacities?: MissingHelpCapacity[]
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
  force: z.boolean().optional().default(false),
})

export const makePairs = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => parseValidatedInput(makePairsInputSchema, data))
  .handler(async ({ data }): Promise<MakePairsResponse> => {
    const { groupId, force } = data

    try {
      const { prisma } = await import('@/shared/lib/prismaClient')
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
          message: 'This group already has an active pairing. Reset the pool before making new pairs.',
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
      const missingHelpCapacities = findMissingHelpCapacities(pairingTasks, pairingHelpCapacities)

      if (!force && missingHelpCapacities.length > 0) {
        return {
          success: false,
          message: `There are ${missingHelpCapacities.length} missing help capacities. Please confirm if you want to proceed.`,
          data: { missingHelpCapacities },
        }
      }

      const pairs = buildPairs(pairingTasks, pairingHelpCapacities)

      if (pairs.length === 0) {
        return {
          success: false,
          message: 'Not enough compatible tasks were available to make pairs',
        }
      }

      const pairing = await prisma.pairing.create({
        data: {
          group_id: groupId,
        },
      })

      for (const pair of pairs) {
        await prisma.pair.create({
          data: {
            pairing_id: pairing.id,
            first_user: pair.firstUser,
            second_user: pair.secondUser,
          },
        })

        await prisma.affinity.create({
          data: {
            pairing_id: pairing.id,
            helpee_id: pair.firstUser,
            helper_id: pair.secondUser,
            value: pair.affinity,
          },
        })

        await prisma.affinity.create({
          data: {
            pairing_id: pairing.id,
            helpee_id: pair.secondUser,
            helper_id: pair.firstUser,
            value: pair.affinity,
          },
        })
      }

      const pairedTaskIds = pairs.flatMap(pair => pair.taskIds).map(taskId => BigInt(taskId))

      await prisma.task.updateMany({
        where: {
          id: {
            in: pairedTaskIds,
          },
        },
        data: {
          pairing_id: pairing.id,
        },
      })

      await prisma.group.update({
        where: { id: groupId },
        data: { active_pairing_id: pairing.id },
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
      console.error(error)
      return { success: false, message: 'Failed to make pairs' }
    }
  })
