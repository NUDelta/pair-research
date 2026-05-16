import type { GroupSessionEvent, GroupSessionTask } from '@/features/groups/lib/groupSessionEvents'
import type { PairingHistory } from '@/features/groups/lib/pairing'
import { buildPairs } from '@/features/groups/lib/pairing'

type PrismaClient = Awaited<ReturnType<typeof import('@/shared/server/prisma').getPrismaClient>>

interface GroupSessionRequest {
  groupId: string
  userId: string
}

interface UpsertTaskRequest extends GroupSessionRequest {
  description: string
}

interface DeleteTaskRequest extends GroupSessionRequest {
  taskId: string
}

interface UpsertRatingsRequest extends GroupSessionRequest {
  updates: Array<{
    taskId: string
    capacity: number
  }>
}

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

const ACTIVE_PAIRING_EXISTS_MESSAGE = 'This group already has an active pairing. Reset the pool before making new pairs.'
const POOL_CHANGED_MESSAGE = 'The pool changed before pairs could be created. Please review the current pool and try again.'

interface StoredTaskRow {
  id: string
  user_id: string
  description: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

interface StoredRatingRow {
  task_id: string
  user_id: string
  help_capacity: number
  completion_order: number | null
}

async function getPrisma(): Promise<PrismaClient> {
  const { getPrismaClient } = await import('@/shared/server/prisma')

  return getPrismaClient()
}

function toStoredTask(task: StoredTaskRow, viewerRatings: Map<string, number>, progressByUserId: Map<string, {
  count: number
  completionOrder: number | null
}>): GroupSessionTask {
  const progress = progressByUserId.get(task.user_id)

  return {
    id: task.id,
    description: task.description,
    userId: task.user_id,
    fullName: task.full_name,
    avatarUrl: task.avatar_url,
    helpCapacity: viewerRatings.get(task.id) ?? null,
    ratingsCompletedCount: progress?.count ?? 0,
    ratingsCompletionOrder: progress?.completionOrder ?? null,
  }
}

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

export class GroupSessionDO {
  private readonly ctx: DurableObjectState
  private hydrated = false
  private operationQueue: Promise<unknown> = Promise.resolve()

  constructor(ctx: DurableObjectState, _env: Cloudflare.Env) {
    this.ctx = ctx

    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS active_tasks (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          description TEXT NOT NULL,
          full_name TEXT,
          avatar_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `)
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS ratings (
          task_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          help_capacity INTEGER NOT NULL,
          completion_order INTEGER,
          PRIMARY KEY (task_id, user_id)
        )
      `)
    })
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const userId = request.headers.get('x-pair-research-user-id')
    const groupId = request.headers.get('x-pair-research-group-id')
    if (userId === null || userId.length === 0 || groupId === null || groupId.length === 0) {
      return new Response('Missing group session user', { status: 401 })
    }

    await this.ensureHydrated(groupId)

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    server.serializeAttachment({ userId })
    this.ctx.acceptWebSocket(server)
    server.send(JSON.stringify({
      type: 'snapshot',
      tasks: this.getTasksForUser(userId),
    } satisfies GroupSessionEvent))

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  webSocketMessage(webSocket: WebSocket, message: string | ArrayBuffer): void {
    if (message === 'ping') {
      webSocket.send('pong')
    }
  }

  webSocketError(webSocket: WebSocket): void {
    webSocket.close(1011, 'Group session socket error')
  }

  async upsertTask(request: UpsertTaskRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => {
      try {
        const prisma = await getPrisma()
        const membership = await this.getMembership(prisma, request.groupId, request.userId)

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

        await this.ensureHydrated(request.groupId, prisma)
        this.ctx.storage.sql.exec(
          `INSERT INTO active_tasks (id, user_id, description, full_name, avatar_url, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             user_id = excluded.user_id,
             description = excluded.description,
             full_name = excluded.full_name,
             avatar_url = excluded.avatar_url,
             created_at = excluded.created_at,
             updated_at = excluded.updated_at`,
          String(task.id),
          task.user_id,
          task.description,
          task.profile.full_name,
          task.profile.avatar_url,
          task.created_at.toISOString(),
          task.updated_at.toISOString(),
        )

        this.broadcast({
          type: 'task:upserted',
          task: toStoredTask({
            id: String(task.id),
            user_id: task.user_id,
            description: task.description,
            full_name: task.profile.full_name,
            avatar_url: task.profile.avatar_url,
            created_at: task.created_at.toISOString(),
            updated_at: task.updated_at.toISOString(),
          }, new Map(), this.getRatingProgressByUserId()),
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
    })
  }

  async deleteTask(request: DeleteTaskRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => {
      try {
        const prisma = await getPrisma()
        const membership = await this.getMembership(prisma, request.groupId, request.userId)

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

        await this.ensureHydrated(request.groupId, prisma)
        this.ctx.storage.sql.exec('DELETE FROM ratings WHERE task_id = ? OR user_id = ?', request.taskId, request.userId)
        this.ctx.storage.sql.exec('DELETE FROM active_tasks WHERE id = ?', request.taskId)
        this.broadcast({
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
    })
  }

  async upsertRatings(request: UpsertRatingsRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => {
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
        const membership = await this.getMembership(prisma, request.groupId, request.userId)

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

        await this.ensureHydrated(request.groupId, prisma)
        for (const rating of savedRatings) {
          this.ctx.storage.sql.exec(
            `INSERT INTO ratings (task_id, user_id, help_capacity, completion_order)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(task_id, user_id) DO UPDATE SET
               help_capacity = excluded.help_capacity,
               completion_order = excluded.completion_order`,
            String(rating.task_id),
            rating.user_id,
            rating.help_capacity,
            Number(rating.id),
          )
        }
        this.broadcast({
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
    })
  }

  async makePairs(request: GroupSessionRequest): Promise<MakePairsResponse> {
    return this.runExclusive(async () => {
      try {
        const prisma = await getPrisma()
        const membership = await this.getMembership(prisma, request.groupId, request.userId)

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

        await this.ensureHydrated(request.groupId, prisma)
        const tasks = this.getStoredTasks()

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

        const ratings = this.ctx.storage.sql.exec<StoredRatingRow>(
          'SELECT task_id, user_id, help_capacity, completion_order FROM ratings',
        ).toArray()
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

        for (const taskId of pairedTaskIds) {
          this.ctx.storage.sql.exec('DELETE FROM active_tasks WHERE id = ?', taskId)
        }
        this.ctx.storage.sql.exec(
          `DELETE FROM ratings
           WHERE task_id NOT IN (SELECT id FROM active_tasks)`,
        )
        this.broadcast({
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
    })
  }

  async resetPool(request: GroupSessionRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => {
      try {
        const prisma = await getPrisma()
        const membership = await this.getMembership(prisma, request.groupId, request.userId)

        if (membership === null) {
          return {
            success: false,
            message: 'You are not a member in this group',
          }
        }

        if (!membership.is_admin) {
          return {
            success: false,
            message: 'Only group admins can reset the pool',
          }
        }

        const activeTasks = await prisma.task.findMany({
          where: {
            group_id: request.groupId,
            delete_pending: {
              not: true,
            },
          },
          select: {
            id: true,
          },
        })
        const activeTaskIds = activeTasks.map(task => task.id)

        await prisma.$transaction(async (tx) => {
          if (activeTaskIds.length > 0) {
            await tx.task_help_capacity.deleteMany({
              where: {
                task_id: {
                  in: activeTaskIds,
                },
              },
            })
          }

          await tx.group.update({
            where: {
              id: request.groupId,
            },
            data: {
              active_pairing_id: null,
            },
          })

          if (activeTaskIds.length > 0) {
            await tx.task.deleteMany({
              where: {
                id: {
                  in: activeTaskIds,
                },
              },
            })
          }
        })

        this.ctx.storage.sql.exec('DELETE FROM ratings')
        this.ctx.storage.sql.exec('DELETE FROM active_tasks')
        this.hydrated = true
        this.broadcast({ type: 'pool:reset' })

        return {
          success: true,
          message: 'Pool reset successfully',
        }
      }
      catch (error) {
        console.error('Error resetting pool through group session:', error)
        return {
          success: false,
          message: 'Failed to reset the pool',
        }
      }
    })
  }

  private async runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const previousOperation = this.operationQueue
    let release: () => void = () => {}
    this.operationQueue = new Promise<void>((resolve) => {
      release = resolve
    })

    await previousOperation.catch(() => undefined)

    try {
      return await operation()
    }
    finally {
      release()
    }
  }

  private async ensureHydrated(groupId: string, prisma?: PrismaClient): Promise<void> {
    if (this.hydrated) {
      return
    }

    const db = prisma ?? await getPrisma()

    const tasks = await db.task.findMany({
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
        created_at: true,
        updated_at: true,
        profile: {
          select: {
            full_name: true,
            avatar_url: true,
          },
        },
      },
    })
    const activeTaskIds = tasks.map(task => task.id)
    const ratings = activeTaskIds.length > 0
      ? await db.task_help_capacity.findMany({
          where: {
            task_id: {
              in: activeTaskIds,
            },
          },
          select: {
            id: true,
            task_id: true,
            user_id: true,
            help_capacity: true,
          },
        })
      : []

    this.ctx.storage.sql.exec('DELETE FROM ratings')
    this.ctx.storage.sql.exec('DELETE FROM active_tasks')

    for (const task of tasks) {
      this.ctx.storage.sql.exec(
        `INSERT INTO active_tasks (id, user_id, description, full_name, avatar_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        String(task.id),
        task.user_id,
        task.description,
        task.profile.full_name,
        task.profile.avatar_url,
        task.created_at.toISOString(),
        task.updated_at.toISOString(),
      )
    }

    for (const rating of ratings) {
      this.ctx.storage.sql.exec(
        `INSERT INTO ratings (task_id, user_id, help_capacity, completion_order)
         VALUES (?, ?, ?, ?)`,
        String(rating.task_id),
        rating.user_id,
        rating.help_capacity,
        Number(rating.id),
      )
    }

    this.hydrated = true
  }

  private getStoredTasks(): StoredTaskRow[] {
    return this.ctx.storage.sql.exec<StoredTaskRow>(
      `SELECT id, user_id, description, full_name, avatar_url, created_at, updated_at
       FROM active_tasks
       ORDER BY created_at ASC, id ASC`,
    ).toArray()
  }

  private getTasksForUser(userId: string): GroupSessionTask[] {
    const viewerRatings = new Map(
      this.ctx.storage.sql.exec<Pick<StoredRatingRow, 'task_id' | 'help_capacity'>>(
        'SELECT task_id, help_capacity FROM ratings WHERE user_id = ?',
        userId,
      ).toArray().map(rating => [rating.task_id, rating.help_capacity]),
    )
    const progressByUserId = this.getRatingProgressByUserId()

    return this.getStoredTasks().map(task => toStoredTask(task, viewerRatings, progressByUserId))
  }

  private getRatingProgressByUserId(): Map<string, { count: number, completionOrder: number | null }> {
    const progress = new Map<string, { count: number, completionOrder: number | null }>()
    const ratings = this.ctx.storage.sql.exec<StoredRatingRow>(
      'SELECT task_id, user_id, help_capacity, completion_order FROM ratings',
    ).toArray()

    for (const rating of ratings) {
      const current = progress.get(rating.user_id) ?? {
        count: 0,
        completionOrder: null,
      }
      progress.set(rating.user_id, {
        count: current.count + 1,
        completionOrder: current.completionOrder === null
          ? rating.completion_order
          : Math.max(current.completionOrder, rating.completion_order ?? 0),
      })
    }

    return progress
  }

  private broadcast(event: GroupSessionEvent): void {
    const serialized = JSON.stringify(event)

    for (const webSocket of this.ctx.getWebSockets()) {
      webSocket.send(serialized)
    }
  }

  private async getMembership(prisma: PrismaClient, groupId: string, userId: string): Promise<{ is_admin: boolean } | null> {
    return prisma.group_member.findFirst({
      where: {
        group_id: groupId,
        user_id: userId,
        is_pending: false,
      },
      select: {
        is_admin: true,
      },
    })
  }
}
