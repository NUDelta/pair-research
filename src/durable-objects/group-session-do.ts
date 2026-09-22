import type { GroupSessionRuntime } from './group-session/runtime'
import type {
  DeleteTaskRequest,
  GroupSessionRequest,
  GroupSessionSnapshot,
  MakePairsResponse,
  PrismaClient,
  UpsertRatingsRequest,
  UpsertTaskRequest,
} from './group-session/types'
import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import { DurableObject } from 'cloudflare:workers'
import { GROUP_SESSION_WEBSOCKET_PROTOCOL } from '@/features/groups/lib/groupSessionProtocol'
import { getMembership, getPrisma } from './group-session/database'
import { handleMakePairs } from './group-session/pairing-actions'
import { handleResetPool } from './group-session/pool-actions'
import { handleUpsertRatings } from './group-session/rating-actions'
import { consumeStoredActionRateLimit, getStoredTaskByUserId, getTasksForUser, hasStoredGroupSessionState, hydrateGroupSessionStorage, initializeGroupSessionStorage, removeStoredMemberState } from './group-session/storage'
import { handleDeleteTask, handleUpsertTask } from './group-session/task-actions'

export class GroupSessionDO extends DurableObject<Cloudflare.Env> {
  private hydrated = false
  private hydrating: Promise<void> | null = null
  private operationQueue: Promise<unknown> = Promise.resolve()

  private static readonly MAX_SOCKETS_PER_USER = 3

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env)

    ctx.blockConcurrencyWhile(async () => {
      initializeGroupSessionStorage(this.ctx)
    })
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const userId = request.headers.get('x-pair-research-user-id')
    const groupId = request.headers.get('x-pair-research-group-id')
    if (userId === null || userId.length === 0 || groupId === null || groupId.length === 0) {
      return new Response('Missing group session user', { status: 401 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair) as [WebSocket, WebSocket]
    let authorized = false
    let rateLimited = false

    await this.runExclusive(async () => {
      const prisma = await getPrisma()
      const membership = await getMembership(prisma, groupId, userId)
      if (membership === null) {
        return
      }

      await this.ensureHydrated(groupId)
      const existingSocketCount = this.ctx.getWebSockets().filter((socket) => {
        const attachment = socket.deserializeAttachment() as { userId?: string } | null
        return attachment?.userId === userId
      }).length
      if (existingSocketCount >= GroupSessionDO.MAX_SOCKETS_PER_USER) {
        rateLimited = true
        return
      }
      authorized = true

      server.serializeAttachment({ userId })
      this.ctx.acceptWebSocket(server)
      server.send(JSON.stringify({
        type: 'snapshot',
        tasks: getTasksForUser(this.ctx, userId),
      } satisfies GroupSessionEvent))
    })

    if (!authorized) {
      return new Response(rateLimited ? 'Too many group session connections' : 'Unauthorized group session', {
        status: rateLimited ? 429 : 401,
      })
    }

    return new Response(null, {
      status: 101,
      headers: {
        'Sec-WebSocket-Protocol': GROUP_SESSION_WEBSOCKET_PROTOCOL,
      },
      webSocket: client,
    })
  }

  async webSocketMessage(webSocket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (message === 'ping') {
      const attachment = webSocket.deserializeAttachment() as { userId?: string } | null
      const groupId = this.getBoundGroupId()
      if (attachment?.userId === undefined || groupId === null) {
        webSocket.close(1008, 'Group membership required')
        return
      }

      const membership = await getMembership(await getPrisma(), groupId, attachment.userId)
      if (membership === null) {
        webSocket.close(1008, 'Group membership revoked')
        return
      }
      webSocket.send('pong')
    }
  }

  webSocketError(webSocket: WebSocket): void {
    webSocket.close(1011, 'Group session socket error')
  }

  async upsertTask(request: UpsertTaskRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => this.withActionRateLimit(request, 'task_write', 60, async () => handleUpsertTask(this.runtime(), request)))
  }

  async deleteTask(request: DeleteTaskRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => this.withActionRateLimit(request, 'task_write', 60, async () => handleDeleteTask(this.runtime(), request)))
  }

  async upsertRatings(request: UpsertRatingsRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => this.withActionRateLimit(request, 'rating_write', 60, async () => handleUpsertRatings(this.runtime(), request)))
  }

  async makePairs(request: GroupSessionRequest): Promise<MakePairsResponse> {
    return this.runExclusive(async () => this.withActionRateLimit(request, 'pairing_write', 10, async () => handleMakePairs(this.runtime(), request)))
  }

  async resetPool(request: GroupSessionRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => {
      if (!this.consumeActionRateLimit(request, 'pool_reset', 10)) {
        return { success: false, message: 'Too many requests. Wait a minute and try again.' }
      }
      const response = await handleResetPool(this.runtime(), request)
      if (response.success) {
        this.hydrated = true
      }
      return response
    })
  }

  async getSnapshot(request: GroupSessionRequest): Promise<GroupSessionSnapshot> {
    return this.runExclusive(async () => {
      if (!this.consumeActionRateLimit(request, 'snapshot_read', 120)) {
        throw new Error('Too many requests. Wait a minute and try again.')
      }
      const membership = await getMembership(await getPrisma(), request.groupId, request.userId)
      if (membership === null) {
        throw new Error('You are not a member in this group')
      }
      await this.ensureHydrated(request.groupId)

      return {
        tasks: getTasksForUser(this.ctx, request.userId),
      }
    })
  }

  async reconcileRemovedMember(request: GroupSessionRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => {
      const prisma = await getPrisma()
      const membership = await prisma.group_member.findFirst({
        where: {
          group_id: request.groupId,
          user_id: request.userId,
        },
        select: { id: true },
      })

      if (membership !== null) {
        return { success: false, message: 'Group membership still exists' }
      }

      await this.ensureHydrated(request.groupId, prisma)
      const storedTask = getStoredTaskByUserId(this.ctx, request.userId)
      const removedTaskIds = removeStoredMemberState(this.ctx, request.userId)

      for (const socket of this.ctx.getWebSockets()) {
        const attachment = socket.deserializeAttachment() as { userId?: string } | null
        if (attachment?.userId === request.userId) {
          socket.close(1008, 'Group membership revoked')
        }
      }

      if (storedTask !== null) {
        await this.broadcast(request.groupId, {
          type: 'task:deleted',
          taskId: storedTask.id,
          userId: request.userId,
        }, prisma)
      }

      return {
        success: true,
        message: removedTaskIds.length > 0 ? 'Member session state removed' : 'Member session revoked',
      }
    })
  }

  private runtime(): GroupSessionRuntime {
    return {
      ctx: this.ctx,
      ensureHydrated: this.ensureHydrated.bind(this),
      broadcast: this.broadcast.bind(this),
    }
  }

  private consumeActionRateLimit(request: GroupSessionRequest, action: string, limit: number): boolean {
    this.bindGroupId(request.groupId)
    return consumeStoredActionRateLimit(this.ctx, {
      action,
      limit,
      userId: request.userId,
      windowMs: 60_000,
    })
  }

  private async withActionRateLimit<T extends ActionResponse>(
    request: GroupSessionRequest,
    action: string,
    limit: number,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!this.consumeActionRateLimit(request, action, limit)) {
      return { success: false, message: 'Too many requests. Wait a minute and try again.' } as T
    }
    return operation()
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
    this.bindGroupId(groupId)
    if (this.hydrated) {
      return
    }

    if (this.hydrating !== null) {
      await this.hydrating
      return
    }

    this.hydrating = this.hydrate(groupId, prisma)
    try {
      await this.hydrating
    }
    finally {
      this.hydrating = null
    }
  }

  private async hydrate(groupId: string, prisma?: PrismaClient): Promise<void> {
    if (hasStoredGroupSessionState(this.ctx)) {
      this.hydrated = true
      return
    }

    const db = prisma ?? await getPrisma()
    await hydrateGroupSessionStorage(this.ctx, groupId, db)

    this.hydrated = true
  }

  private async broadcast(groupId: string, event: GroupSessionEvent, prisma?: PrismaClient): Promise<void> {
    this.bindGroupId(groupId)
    const db = prisma ?? await getPrisma()
    const sockets = this.ctx.getWebSockets()
    const userIds = [...new Set(sockets.flatMap((socket) => {
      const attachment = socket.deserializeAttachment() as { userId?: string } | null
      return attachment?.userId === undefined ? [] : [attachment.userId]
    }))]
    const memberships = userIds.length === 0
      ? []
      : await db.group_member.findMany({
          where: {
            group_id: groupId,
            is_pending: false,
            user_id: { in: userIds },
          },
          select: { user_id: true },
        })
    const authorizedUserIds = new Set(memberships.map(membership => membership.user_id))
    const serialized = JSON.stringify(event)

    for (const webSocket of sockets) {
      const attachment = webSocket.deserializeAttachment() as { userId?: string } | null
      if (attachment?.userId === undefined || !authorizedUserIds.has(attachment.userId)) {
        webSocket.close(1008, 'Group membership revoked')
        continue
      }
      webSocket.send(serialized)
    }
  }

  private bindGroupId(groupId: string): void {
    const currentGroupId = this.getBoundGroupId()
    if (currentGroupId !== null && currentGroupId !== groupId) {
      throw new Error('Group session identity mismatch')
    }

    if (currentGroupId === null) {
      this.ctx.storage.sql.exec(
        'CREATE TABLE IF NOT EXISTS session_metadata (group_id TEXT NOT NULL UNIQUE)',
      )
      this.ctx.storage.sql.exec('INSERT INTO session_metadata (group_id) VALUES (?)', groupId)
    }
  }

  private getBoundGroupId(): string | null {
    this.ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS session_metadata (group_id TEXT NOT NULL UNIQUE)',
    )
    const rows = this.ctx.storage.sql.exec<{ group_id: string }>(
      'SELECT group_id FROM session_metadata LIMIT 1',
    ).toArray()
    return rows[0]?.group_id ?? null
  }
}
