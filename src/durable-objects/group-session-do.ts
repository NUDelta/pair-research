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
import { recoverGroupSession } from './group-session/recovery'
import { notifyGroupSession } from './group-session/runtime'
import { getStoredTaskByUserId, getTasksForUser, hasStoredGroupSessionState, hydrateGroupSessionStorage, initializeGroupSessionStorage, readSessionMetadata, removeStoredMemberState, retainStoredMembers, writeSessionMetadata } from './group-session/storage'
import { handleDeleteTask, handleUpsertTask } from './group-session/task-actions'

export class GroupSessionDO extends DurableObject<Cloudflare.Env> {
  private hydrated = false
  private hydrating: Promise<void> | null = null
  private operationQueue: Promise<unknown> = Promise.resolve()

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

    const authorized = await this.runExclusive(async () => {
      const prisma = await getPrisma()
      if (await getMembership(prisma, groupId, userId) === null) {
        return false
      }
      await this.ensureHydrated(groupId, prisma)

      server.serializeAttachment({ userId })
      this.ctx.acceptWebSocket(server)
      server.send(JSON.stringify({
        type: 'snapshot',
        tasks: getTasksForUser(this.ctx, userId),
      } satisfies GroupSessionEvent))
      return true
    })
    if (!authorized) {
      return new Response('Group membership required', { status: 401 })
    }

    return new Response(null, {
      status: 101,
      headers: {
        'Sec-WebSocket-Protocol': GROUP_SESSION_WEBSOCKET_PROTOCOL,
      },
      webSocket: client,
    })
  }

  webSocketMessage(webSocket: WebSocket, message: string | ArrayBuffer): void {
    if (message === 'ping') {
      webSocket.send('pong')
    }
  }

  webSocketClose(webSocket: WebSocket, code: number, reason: string): void {
    webSocket.close([1005, 1006, 1015].includes(code) ? 1000 : code, reason)
  }

  webSocketError(webSocket: WebSocket): void {
    webSocket.close(1011, 'Group session socket error')
  }

  async upsertTask(request: UpsertTaskRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => handleUpsertTask(this.runtime(), request))
  }

  async deleteTask(request: DeleteTaskRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => handleDeleteTask(this.runtime(), request))
  }

  async upsertRatings(request: UpsertRatingsRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => handleUpsertRatings(this.runtime(), request))
  }

  async makePairs(request: GroupSessionRequest): Promise<MakePairsResponse> {
    return this.runExclusive(async () => handleMakePairs(this.runtime(), request))
  }

  async resetPool(request: GroupSessionRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => {
      const response = await handleResetPool(this.runtime(), request)
      if (response.success) {
        this.hydrated = true
      }
      return response
    })
  }

  async getSnapshot(request: GroupSessionRequest): Promise<GroupSessionSnapshot> {
    return this.runExclusive(async () => {
      const prisma = await getPrisma()
      if (await getMembership(prisma, request.groupId, request.userId) === null) {
        throw new Error('You are not a member in this group')
      }
      await this.ensureHydrated(request.groupId, prisma)
      const members = await prisma.group_member.findMany({
        where: { group_id: request.groupId, is_pending: false },
        select: { user_id: true },
      })
      retainStoredMembers(this.ctx, new Set(members.map(member => member.user_id)))

      return {
        tasks: getTasksForUser(this.ctx, request.userId),
      }
    })
  }

  async reconcileRemovedMember(request: GroupSessionRequest): Promise<ActionResponse> {
    return this.runExclusive(async () => {
      const prisma = await getPrisma()
      const membership = await prisma.group_member.findFirst({
        where: { group_id: request.groupId, user_id: request.userId },
        select: { id: true },
      })
      // A later invitation or rejoin owns the current membership and pool state.
      if (membership !== null) {
        return { success: true, message: 'Current membership preserved' }
      }
      await this.ensureHydrated(request.groupId, prisma)
      const task = getStoredTaskByUserId(this.ctx, request.userId)
      removeStoredMemberState(this.ctx, request.userId)
      for (const socket of this.ctx.getWebSockets()) {
        const attachment = socket.deserializeAttachment() as { userId?: string } | null
        if (attachment?.userId === request.userId) {
          try {
            socket.close(1008, 'Group membership revoked')
          }
          catch { /* Already closed. */ }
        }
      }
      if (task !== null) {
        await notifyGroupSession(this.runtime(), request.groupId, { type: 'task:deleted', taskId: task.id, userId: request.userId })
      }
      return { success: true, message: 'Member session state removed' }
    })
  }

  private runtime(): GroupSessionRuntime {
    return {
      ctx: this.ctx,
      ensureHydrated: this.ensureHydrated.bind(this),
      broadcast: this.broadcast.bind(this),
    }
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
    const boundGroupId = readSessionMetadata(this.ctx, 'groupId')
    if (boundGroupId !== null && boundGroupId !== groupId) {
      throw new Error('Group session identity mismatch')
    }
    writeSessionMetadata(this.ctx, 'groupId', groupId)
    if (readSessionMetadata(this.ctx, 'pending') !== null) {
      const event = await recoverGroupSession(this.ctx, prisma ?? await getPrisma())
      if (event !== null) {
        await notifyGroupSession(this.runtime(), groupId, event)
      }
    }
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

  private async broadcast(groupId: string, event: GroupSessionEvent): Promise<void> {
    const sockets = this.ctx.getWebSockets().filter(socket => socket.readyState === WebSocket.OPEN)
    if (sockets.length === 0) {
      return
    }
    const prisma = await getPrisma()
    const members = await prisma.group_member.findMany({
      where: { group_id: groupId, is_pending: false },
      select: { user_id: true },
    })
    const authorized = new Set(members.map(member => member.user_id))
    const serialized = JSON.stringify(event)
    for (const socket of sockets) {
      const attachment = socket.deserializeAttachment() as { userId?: string } | null
      try {
        if (attachment?.userId === undefined || !authorized.has(attachment.userId)) {
          socket.close(1008, 'Group membership revoked')
        }
        else {
          socket.send(serialized)
        }
      }
      catch {
        try {
          socket.close(1011, 'Reconnect to synchronize')
        }
        catch { /* Already closed. */ }
      }
    }
  }
}
