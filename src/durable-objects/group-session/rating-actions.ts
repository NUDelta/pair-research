import type { GroupSessionRuntime } from './runtime'
import type { UpsertRatingsRequest } from './types'
import { getMembership, getPrisma } from './database'
import { upsertStoredRatings } from './storage'

export async function handleUpsertRatings(
  runtime: GroupSessionRuntime,
  request: UpsertRatingsRequest,
): Promise<ActionResponse> {
  try {
    const validUpdates = request.updates.filter(
      update => Number.isInteger(update.capacity) && update.capacity >= 1 && update.capacity <= 5,
    )

    if (validUpdates.length === 0) {
      return {
        success: false,
        message: 'No valid capacities to update.',
      }
    }

    const prisma = await getPrisma()
    const membership = await getMembership(prisma, request.groupId, request.userId)

    if (membership === null) {
      return {
        success: false,
        message: 'You are not a member in this group',
      }
    }

    const currentUserTask = await prisma.task.findFirst({
      where: {
        group_id: request.groupId,
        user_id: request.userId,
        pairing_id: null,
        delete_pending: {
          not: true,
        },
      },
      select: {
        id: true,
      },
    })

    if (currentUserTask === null) {
      return {
        success: false,
        message: 'Join the current pool before rating other members',
      }
    }

    const allowedTasks = await prisma.task.findMany({
      where: {
        group_id: request.groupId,
        user_id: {
          not: request.userId,
        },
        pairing_id: null,
        delete_pending: {
          not: true,
        },
      },
      select: {
        id: true,
      },
    })
    const allowedTaskIds = new Set(allowedTasks.map(task => String(task.id)))
    const scopedUpdates = validUpdates.filter(update => allowedTaskIds.has(update.taskId))

    if (scopedUpdates.length === 0) {
      return {
        success: false,
        message: 'No valid group tasks to update.',
      }
    }

    const savedRatings = await Promise.all(
      scopedUpdates.map(async ({ taskId, capacity }) =>
        prisma.task_help_capacity.upsert({
          where: {
            task_id_user_id: {
              task_id: BigInt(taskId),
              user_id: request.userId,
            },
          },
          update: {
            help_capacity: capacity,
          },
          create: {
            user_id: request.userId,
            task_id: BigInt(taskId),
            help_capacity: capacity,
          },
        }),
      ),
    )

    await runtime.ensureHydrated(request.groupId, prisma)
    upsertStoredRatings(runtime.ctx, savedRatings)
    runtime.broadcast({
      type: 'ratings:updated',
      taskIds: scopedUpdates.map(update => update.taskId),
    })

    return {
      success: true,
      message: 'Help capacities updated.',
    }
  }
  catch (error) {
    console.error('Error upserting ratings through group session:', error)
    return {
      success: false,
      message: 'Failed to upsert help capacities.',
    }
  }
}
