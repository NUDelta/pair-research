import type { GroupSessionRuntime } from './runtime'
import type { DeleteTaskRequest, UpsertTaskRequest } from './types'
import { getMembership, getPrisma } from './database'
import { deleteStoredTaskAndRatings, getRatingProgressByUserId, toStoredTask, upsertStoredTask } from './storage'

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

    const existingTask = await prisma.task.findUnique({
      where: {
        user_id_group_id: {
          user_id: request.userId,
          group_id: request.groupId,
        },
      },
      select: {
        pairing_id: true,
      },
    })

    if (existingTask?.pairing_id !== null && existingTask?.pairing_id !== undefined) {
      return {
        success: false,
        message: 'You already have a task in the current active pairing',
      }
    }

    const task = await prisma.task.upsert({
      where: {
        user_id_group_id: {
          user_id: request.userId,
          group_id: request.groupId,
        },
      },
      update: {
        description: request.description,
        delete_pending: false,
        updated_at: new Date(),
      },
      create: {
        description: request.description,
        user_id: request.userId,
        group_id: request.groupId,
        created_at: new Date(),
        updated_at: new Date(),
        delete_pending: false,
      },
      include: {
        profile: {
          select: {
            full_name: true,
            avatar_url: true,
          },
        },
      },
    })

    await runtime.ensureHydrated(request.groupId, prisma)
    const storedTask = {
      id: String(task.id),
      user_id: task.user_id,
      description: task.description,
      full_name: task.profile.full_name,
      avatar_url: task.profile.avatar_url,
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
    }
    upsertStoredTask(runtime.ctx, storedTask)

    runtime.broadcast({
      type: 'task:upserted',
      task: toStoredTask(storedTask, new Map(), getRatingProgressByUserId(runtime.ctx)),
    })

    return {
      success: true,
      message: 'You have update your task successfully',
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

    const id = BigInt(request.taskId)
    const task = await prisma.task.findUnique({
      where: { id },
    })

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

    if (task.group_id !== request.groupId) {
      return {
        success: false,
        message: 'Task does not belong to this group',
      }
    }

    if (task.pairing_id !== null) {
      return {
        success: false,
        message: 'You cannot leave the pool while your task is part of an active pairing',
      }
    }

    const activeTasks = await prisma.task.findMany({
      where: {
        group_id: request.groupId,
        pairing_id: null,
        delete_pending: {
          not: true,
        },
      },
      select: {
        id: true,
      },
    })
    const activeTaskIds = activeTasks.map(currentTask => currentTask.id)

    await prisma.$transaction(async (tx) => {
      if (activeTaskIds.length > 0) {
        await tx.task_help_capacity.deleteMany({
          where: {
            task_id: { in: activeTaskIds },
            user_id: request.userId,
          },
        })
      }

      await tx.task_help_capacity.deleteMany({
        where: { task_id: id },
      })

      await tx.task.delete({
        where: { id },
      })
    })

    await runtime.ensureHydrated(request.groupId, prisma)
    deleteStoredTaskAndRatings(runtime.ctx, request.taskId, request.userId)
    runtime.broadcast({
      type: 'task:deleted',
      taskId: request.taskId,
      userId: request.userId,
    })

    return {
      success: true,
      message: 'You have delete your task successfully',
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
