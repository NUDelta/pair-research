import type { GroupSessionRuntime } from './runtime'
import type { DeleteTaskRequest, UpsertTaskRequest } from './types'
import { getMembership, getPrisma } from './database'
import {
  deleteStoredTaskAndRatings,
  getRatingProgressByUserId,
  getStoredTaskById,
  getStoredTaskByUserId,
  toStoredTask,
  upsertStoredTask,
} from './storage'

export async function handleUpsertTask(
  runtime: GroupSessionRuntime,
  request: UpsertTaskRequest,
): Promise<ActionResponse> {
  try {
    const prisma = await getPrisma()
    const membership = await getMembership(prisma, request.groupId, request.userId)

    if (membership === null) {
      return {
        success: false,
        message: 'You are not a member in this group',
      }
    }

    const group = await prisma.group.findUnique({
      where: { id: request.groupId },
      select: {
        active_pairing_id: true,
      },
    })

    if (group?.active_pairing_id !== null && group?.active_pairing_id !== undefined) {
      return {
        success: false,
        message: 'Task edits are disabled while this group has an active pairing',
      }
    }

    const profile = await prisma.profile.findUnique({
      where: { id: request.userId },
      select: {
        full_name: true,
        avatar_url: true,
      },
    })

    await runtime.ensureHydrated(request.groupId, prisma)
    const existingTask = getStoredTaskByUserId(runtime.ctx, request.userId)
    const now = new Date().toISOString()
    const storedTask = {
      id: existingTask?.id ?? request.userId,
      user_id: request.userId,
      description: request.description,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
      created_at: existingTask?.created_at ?? now,
      updated_at: now,
    }
    upsertStoredTask(runtime.ctx, storedTask)

    runtime.broadcast({
      type: 'task:upserted',
      task: toStoredTask(storedTask, new Map(), getRatingProgressByUserId(runtime.ctx)),
    })

    return {
      success: true,
      message: 'You have updated your task successfully',
    }
  }
  catch (error) {
    console.error('Error upserting task through group session:', error)
    return {
      success: false,
      message: 'Failed to update the task',
    }
  }
}

export async function handleDeleteTask(
  runtime: GroupSessionRuntime,
  request: DeleteTaskRequest,
): Promise<ActionResponse> {
  try {
    const prisma = await getPrisma()
    const membership = await getMembership(prisma, request.groupId, request.userId)

    if (membership === null) {
      return {
        success: false,
        message: 'You are not a member in this group',
      }
    }

    await runtime.ensureHydrated(request.groupId, prisma)
    const task = getStoredTaskById(runtime.ctx, request.taskId)

    if (task === null) {
      return {
        success: false,
        message: 'Task not found',
      }
    }

    if (task.user_id !== request.userId) {
      return {
        success: false,
        message: 'You are not allowed to delete this task',
      }
    }

    const group = await prisma.group.findUnique({
      where: { id: request.groupId },
      select: {
        active_pairing_id: true,
      },
    })
    if (group?.active_pairing_id !== null && group?.active_pairing_id !== undefined) {
      return {
        success: false,
        message: 'You cannot leave the pool while your task is part of an active pairing',
      }
    }

    deleteStoredTaskAndRatings(runtime.ctx, request.taskId, request.userId)
    runtime.broadcast({
      type: 'task:deleted',
      taskId: request.taskId,
      userId: request.userId,
    })

    return {
      success: true,
      message: 'You have deleted your task successfully',
    }
  }
  catch (error) {
    console.error('Error deleting task through group session:', error)
    return {
      success: false,
      message: 'Failed to delete the task',
    }
  }
}
