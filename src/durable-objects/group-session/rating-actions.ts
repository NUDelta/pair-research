import type { GroupSessionRuntime } from './runtime'
import type { UpsertRatingsRequest } from './types'
import { getMembership, getPrisma } from './database'
import { getStoredTaskByUserId, getStoredTasks, upsertStoredRatingUpdates } from './storage'

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

    await runtime.ensureHydrated(request.groupId, prisma)
    const currentUserTask = getStoredTaskByUserId(runtime.ctx, request.userId)

    if (currentUserTask === null) {
      return {
        success: false,
        message: 'Join the current pool before rating other members',
      }
    }

    const allowedTasks = getStoredTasks(runtime.ctx)
      .filter(task => task.user_id !== request.userId)
    const allowedTaskIds = new Set(allowedTasks.map(task => task.id))
    const scopedUpdates = validUpdates.filter(update => allowedTaskIds.has(update.taskId))

    if (scopedUpdates.length === 0) {
      return {
        success: false,
        message: 'No valid group tasks to update.',
      }
    }

    const progress = upsertStoredRatingUpdates(runtime.ctx, request.userId, scopedUpdates)
    runtime.broadcast({
      type: 'ratings:updated',
      taskIds: scopedUpdates.map(update => update.taskId),
      userId: request.userId,
      ratingsCompletedCount: progress.count,
      ratingsCompletionOrder: progress.completionOrder,
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
