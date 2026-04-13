import { createServerFn } from '@tanstack/react-start'

interface MissingHelpCapacity {
  taskId: string
  taskDescription: string
  userId: string
  userName: string
}

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

export const makePairs = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'object' || data === null || !('groupId' in data)) {
      throw new Error('Group ID is required')
    }

    return { groupId: String(data.groupId) }
  })
  .handler(async ({ data }): Promise<MakePairsResponse> => {
    const { groupId } = data

    try {
      const { prisma } = await import('@/shared/lib/prismaClient')
      const tasks = await prisma.task.findMany({
        where: {
          group_id: groupId,
        },
        include: {
          profile: true,
        },
      })

      const helpCapacities = await prisma.task_help_capacity.findMany({
        where: {
          task: {
            group_id: groupId,
          },
        },
        include: {
          profile: true,
          task: true,
        },
      })

      const missingHelpCapacities: MissingHelpCapacity[] = []
      const userIds = tasks.map(task => task.user_id)

      for (const task of tasks) {
        for (const userId of userIds) {
          if (userId === task.user_id) {
            continue
          }

          const hasHelpCapacity = helpCapacities.some(
            capacity => capacity.task_id === task.id && capacity.user_id === userId,
          )

          if (!hasHelpCapacity) {
            const user = tasks.find(t => t.user_id === userId)?.profile
            missingHelpCapacities.push({
              taskId: String(task.id),
              taskDescription: task.description,
              userId,
              userName: user?.full_name ?? 'Unknown User',
            })
          }
        }
      }

      if (missingHelpCapacities.length > 0) {
        return {
          success: false,
          message: `There are ${missingHelpCapacities.length} missing help capacities. Please confirm if you want to proceed.`,
          data: { missingHelpCapacities },
        }
      }

      const pairing = await prisma.pairing.create({
        data: {
          group_id: groupId,
        },
      })

      const pairs: { firstUser: string, secondUser: string, affinity: number }[] = []
      const usedTasks = new Set<bigint>()

      const sortedTasks = [...tasks].sort((a, b) => {
        const aCapacity = helpCapacities
          .filter(c => c.task_id === a.id)
          .reduce((sum, c) => sum + c.help_capacity, 0)
        const bCapacity = helpCapacities
          .filter(c => c.task_id === b.id)
          .reduce((sum, c) => sum + c.help_capacity, 0)
        return bCapacity - aCapacity
      })

      for (const task1 of sortedTasks) {
        if (usedTasks.has(task1.id)) {
          continue
        }

        let bestMatch: { task: typeof task1, affinity: number } | null = null

        for (const task2 of sortedTasks) {
          if (task2.id === task1.id || usedTasks.has(task2.id)) {
            continue
          }

          const affinity1 = helpCapacities.find(c =>
            c.task_id === task1.id && c.user_id === task2.user_id,
          )?.help_capacity ?? 0
          const affinity2 = helpCapacities.find(c =>
            c.task_id === task2.id && c.user_id === task1.user_id,
          )?.help_capacity ?? 0
          const totalAffinity = affinity1 + affinity2

          if (!bestMatch || totalAffinity > bestMatch.affinity) {
            bestMatch = { task: task2, affinity: totalAffinity }
          }
        }

        if (bestMatch) {
          pairs.push({
            firstUser: task1.user_id,
            secondUser: bestMatch.task.user_id,
            affinity: bestMatch.affinity,
          })
          usedTasks.add(task1.id)
          usedTasks.add(bestMatch.task.id)
        }
      }

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

      await prisma.task.updateMany({
        where: {
          group_id: groupId,
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
        data: { pairingId: pairing.id, pairs },
      }
    }
    catch (error) {
      console.error(error)
      return { success: false, message: 'Failed to make pairs' }
    }
  })
