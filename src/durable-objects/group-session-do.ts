import type { GroupSessionRuntime } from './group-session/runtime'
import type {
  DeleteTaskRequest,
  GroupSessionRequest,
  MakePairsResponse,
  PrismaClient,
  UpsertRatingsRequest,
  UpsertTaskRequest,
} from './group-session/types'
import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import { DurableObject } from 'cloudflare:workers'
import { getPrisma } from './group-session/database'
import { handleMakePairs } from './group-session/pairing-actions'
import { handleResetPool } from './group-session/pool-actions'
import { handleUpsertRatings } from './group-session/rating-actions'
import { getTasksForUser, hydrateGroupSessionStorage, initializeGroupSessionStorage } from './group-session/storage'
import { handleDeleteTask, handleUpsertTask } from './group-session/task-actions'

export class GroupSessionDO extends DurableObject<Cloudflare.Env> {
  private hydrated = false
  private operationQueue: Promise<unknown> = Promise.resolve()

  constructor(ctx: DurableObjectState, env: Cloudflare.Env) {
    super(ctx, env)

    ctx.blockConcurrencyWhile(async () => {
      initializeGroupSessionStorage(this.ctx)
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
      tasks: getTasksForUser(this.ctx, userId),
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
    if (this.hydrated) {
      return
    }

    const db = prisma ?? await getPrisma()
    await hydrateGroupSessionStorage(this.ctx, groupId, db)

    this.hydrated = true
  }

  private broadcast(event: GroupSessionEvent): void {
    const serialized = JSON.stringify(event)

    for (const webSocket of this.ctx.getWebSockets()) {
      webSocket.send(serialized)
    }
  }
}
