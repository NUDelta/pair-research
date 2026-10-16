import type { GroupSessionDO } from '@/durable-objects/group-session-do'
import { abortAllDurableObjects, evictDurableObject, reset, runInDurableObject } from 'cloudflare:test'
import { env } from 'cloudflare:workers'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getStoredRatings, getStoredTasks, markSessionInitialized, readSessionMetadata, upsertStoredRatingUpdates, upsertStoredTask, writeSessionMetadata } from '@/durable-objects/group-session/storage'

const prisma = vi.hoisted(() => ({
  $transaction: vi.fn(),
  group_member: { findFirst: vi.fn(), findMany: vi.fn() },
  group: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  pairing: { findUnique: vi.fn(), create: vi.fn() },
  task: { findMany: vi.fn(), count: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
  task_help_capacity: { findMany: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
  pair: { createMany: vi.fn() },
  affinity: { createMany: vi.fn() },
  profile: { findUnique: vi.fn() },
}))

vi.mock('@/shared/server/prisma', () => ({ getPrismaClient: () => prisma }))

const request = { groupId: 'group-1', userId: 'alice' }
const timestamp = '2026-10-16T10:00:00.000Z'

function task(id: string, userId: string) {
  return {
    id,
    user_id: userId,
    description: `Task ${id}`,
    full_name: userId,
    avatar_url: null,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

function session(): DurableObjectStub<GroupSessionDO> {
  return env.GROUP_SESSIONS.get(env.GROUP_SESSIONS.newUniqueId())
}

async function seedPending(stub: DurableObjectStub<GroupSessionDO>, pending: object, restart = true) {
  await runInDurableObject(stub, (_instance, state) => {
    writeSessionMetadata(state, 'groupId', request.groupId)
    markSessionInitialized(state)
    for (const [id, userId] of [['1', 'alice'], ['2', 'bob'], ['3', 'charlie']]) {
      upsertStoredTask(state, task(id, userId))
    }
    upsertStoredRatingUpdates(state, 'alice', [{ taskId: '2', capacity: 3 }, { taskId: '3', capacity: 1 }])
    writeSessionMetadata(state, 'pending', JSON.stringify(pending))
  })
  if (restart) {
    await abortAllDurableObjects()
  }
  return env.GROUP_SESSIONS.get(stub.id)
}

async function connect(stub: DurableObjectStub<GroupSessionDO>, userId = request.userId) {
  const response = await stub.fetch('https://group-session.test', {
    headers: {
      'Upgrade': 'websocket',
      'x-pair-research-user-id': userId,
      'x-pair-research-group-id': request.groupId,
    },
  })
  expect(response.status).toBe(101)
  const socket = response.webSocket
  if (socket === null) {
    throw new Error('Expected WebSocket upgrade')
  }
  const snapshot = new Promise<MessageEvent>(resolve => socket.addEventListener('message', resolve, { once: true }))
  socket.accept()
  await snapshot
  return socket
}

beforeEach(() => {
  vi.resetAllMocks()
  prisma.group_member.findFirst.mockResolvedValue({ id: 'member-1', permission: 'owner' })
  prisma.group_member.findMany.mockResolvedValue(['alice', 'bob', 'charlie'].map(user_id => ({ user_id })))
  prisma.group.findUnique.mockResolvedValue({ active_pairing_id: null })
  prisma.task.findMany.mockResolvedValue([])
  prisma.task.count.mockResolvedValue(0)
  prisma.task_help_capacity.findMany.mockResolvedValue([])
  prisma.profile.findUnique.mockResolvedValue({ full_name: 'Alice', avatar_url: null })
  prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma))
})

afterEach(async () => {
  await reset()
})

describe('group session DO in workerd', () => {
  it('keeps an intentionally empty pool empty after instance restart', async () => {
    const staleTask = task('1', 'alice')
    prisma.task.findMany.mockResolvedValue([{
      ...staleTask,
      id: 1n,
      created_at: new Date(timestamp),
      updated_at: new Date(timestamp),
      profile: { full_name: 'Alice', avatar_url: null },
    }])
    let stub = session()
    expect((await stub.getSnapshot(request)).tasks).toHaveLength(1)
    expect(await stub.deleteTask({ ...request, taskId: '1' })).toMatchObject({ success: true })

    await abortAllDurableObjects()
    stub = env.GROUP_SESSIONS.get(stub.id)

    expect((await stub.getSnapshot(request)).tasks).toEqual([])
    expect(prisma.task.findMany).toHaveBeenCalledTimes(1)
    expect(await runInDurableObject(stub, (_instance, state) => readSessionMetadata(state, 'initialized'))).toBe('1')
  })

  it('finishes local pairing cleanup after the Postgres commit without creating another round', async () => {
    let stub = session()
    const pairingId = 'committed-pairing'
    prisma.pairing.findUnique.mockResolvedValue({ id: pairingId })
    stub = await seedPending(stub, {
      kind: 'pair',
      request,
      pairingId,
      pairs: [{ firstUser: 'alice', secondUser: 'bob', affinity: 5, taskIds: ['1', '2'] }],
    })

    expect((await stub.getSnapshot(request)).tasks.map(item => item.id)).toEqual(['3'])
    expect(prisma.pairing.findUnique).toHaveBeenCalledWith({ where: { id: pairingId } })
    expect(prisma.pairing.create).not.toHaveBeenCalled()
    expect(await runInDurableObject(stub, (_instance, state) => ({
      pending: readSessionMetadata(state, 'pending'),
      ratings: getStoredRatings(state),
    }))).toMatchObject({ pending: null, ratings: [{ task_id: '3', user_id: 'alice', help_capacity: 1 }] })

    await abortAllDurableObjects()
    stub = env.GROUP_SESSIONS.get(stub.id)
    expect((await stub.getSnapshot(request)).tasks.map(item => item.id)).toEqual(['3'])
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('persists an interrupted pairing using its reserved id before cleaning the pool', async () => {
    let stub = session()
    const pairingId = 'reserved-pairing'
    prisma.pairing.findUnique.mockResolvedValue(null)
    prisma.pairing.create.mockResolvedValue({ id: pairingId })
    prisma.group.updateMany.mockResolvedValue({ count: 1 })
    const persistedTaskIds: Record<string, bigint> = { alice: 101n, bob: 102n, charlie: 103n }
    prisma.task.upsert.mockImplementation(async ({ create }: { create: { user_id: string } }) => ({
      id: persistedTaskIds[create.user_id],
      user_id: create.user_id,
    }))
    stub = await seedPending(stub, {
      kind: 'pair',
      request,
      pairingId,
      pairs: [{ firstUser: 'alice', secondUser: 'bob', affinity: 5, taskIds: ['1', '2'] }],
    })

    expect((await stub.getSnapshot(request)).tasks.map(item => item.id)).toEqual(['3'])
    expect(prisma.pairing.create).toHaveBeenCalledWith({ data: { id: pairingId, group_id: request.groupId } })
    expect(prisma.task.upsert).toHaveBeenCalledTimes(3)
    expect(prisma.task_help_capacity.createMany).toHaveBeenCalledWith({ data: [
      { task_id: 102n, user_id: 'alice', help_capacity: 3 },
      { task_id: 103n, user_id: 'alice', help_capacity: 1 },
    ] })
    expect(prisma.pair.createMany).toHaveBeenCalledWith({ data: [{ pairing_id: pairingId, first_user: 'alice', second_user: 'bob' }] })

    await abortAllDurableObjects()
    stub = env.GROUP_SESSIONS.get(stub.id)
    expect((await stub.getSnapshot(request)).tasks.map(item => item.id)).toEqual(['3'])
    expect(prisma.pairing.create).toHaveBeenCalledTimes(1)
  })

  it.each(['pair', 'reset'] as const)('notifies connected members once when recovering a committed %s', async (kind) => {
    let stub = session()
    const sockets = [await connect(stub), await connect(stub, 'bob')]
    const events = sockets.map(() => [] as string[])
    for (const [index, socket] of sockets.entries()) {
      socket.addEventListener('message', (event) => {
        events[index].push(String(event.data))
      })
    }
    const delivered = sockets.map(async socket => new Promise<MessageEvent>(resolve => socket.addEventListener('message', resolve, { once: true })))
    const pairingId = 'committed-connected-pairing'
    prisma.pairing.findUnique.mockResolvedValue({ id: pairingId })
    stub = await seedPending(stub, {
      kind,
      request,
      ...(kind === 'pair'
        ? {
            pairingId,
            pairs: [{ firstUser: 'alice', secondUser: 'bob', affinity: 5, taskIds: ['1', '2'] }],
          }
        : {}),
    }, false)
    await evictDurableObject(stub)
    stub = env.GROUP_SESSIONS.get(stub.id)

    expect((await stub.getSnapshot(request)).tasks.map(item => item.id)).toEqual(kind === 'pair' ? ['3'] : [])
    await Promise.all(delivered)
    await stub.getSnapshot(request)
    const synchronized = sockets.map(async socket => new Promise<MessageEvent>(resolve => socket.addEventListener('message', resolve, { once: true })))
    for (const socket of sockets) {
      socket.send('ping')
    }
    await Promise.all(synchronized)

    const expected = kind === 'pair' ? { type: 'pairing:created', pairingId } : { type: 'pool:reset' }
    for (const [index, socket] of sockets.entries()) {
      expect(events[index]).toEqual([JSON.stringify(expected), 'pong'])
      socket.close(1000, 'done')
    }
    expect(prisma.pairing.create).not.toHaveBeenCalled()
    expect(prisma.$transaction).toHaveBeenCalledTimes(kind === 'pair' ? 1 : 0)
  })

  it('clears a committed reset after restart even when its actor is no longer a member', async () => {
    let stub = session()
    stub = await seedPending(stub, { kind: 'reset', request: { ...request, userId: 'former-manager' } })

    expect((await stub.getSnapshot(request)).tasks).toEqual([])
    expect(prisma.$transaction).not.toHaveBeenCalled()
    expect(await runInDurableObject(stub, (_instance, state) => ({
      pending: readSessionMetadata(state, 'pending'),
      initialized: readSessionMetadata(state, 'initialized'),
    }))).toEqual({ pending: null, initialized: '1' })

    await abortAllDurableObjects()
    stub = env.GROUP_SESSIONS.get(stub.id)
    expect((await stub.getSnapshot(request)).tasks).toEqual([])
    expect(prisma.task.findMany).not.toHaveBeenCalled()
  })

  it('retains a failed recovery marker and retries it with the same pairing id', async () => {
    let stub = session()
    const pairingId = 'retry-pairing'
    prisma.pairing.findUnique.mockRejectedValueOnce(new Error('Postgres temporarily unavailable'))
    prisma.pairing.findUnique.mockResolvedValue({ id: pairingId })
    stub = await seedPending(stub, {
      kind: 'pair',
      request,
      pairingId,
      pairs: [{ firstUser: 'alice', secondUser: 'bob', affinity: 5, taskIds: ['1', '2'] }],
    })

    const failure = await runInDurableObject(stub, async (instance) => {
      try {
        await instance.getSnapshot(request)
        return null
      }
      catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
    })
    expect(failure).toBe('Postgres temporarily unavailable')
    const retained = await runInDurableObject(stub, (_instance, state) => ({
      pending: readSessionMetadata(state, 'pending'),
      tasks: getStoredTasks(state).length,
    }))
    expect(retained.pending).toContain(pairingId)
    expect(retained.tasks).toBe(3)

    expect((await stub.getSnapshot(request)).tasks.map(item => item.id)).toEqual(['3'])
    expect(prisma.pairing.findUnique).toHaveBeenNthCalledWith(2, { where: { id: pairingId } })
    expect(prisma.pairing.create).not.toHaveBeenCalled()
  })

  it('replays an unfinished reset before exposing persisted pool tasks', async () => {
    let stub = session()
    prisma.group.findUnique.mockResolvedValue({ active_pairing_id: 'old-pairing' })
    prisma.task.count.mockResolvedValue(3)
    prisma.task.findMany.mockResolvedValue([{ id: 1n }, { id: 2n }])
    stub = await seedPending(stub, { kind: 'reset', request })

    expect((await stub.getSnapshot(request)).tasks).toEqual([])
    expect(prisma.group.update).toHaveBeenCalledWith({ where: { id: request.groupId }, data: { active_pairing_id: null } })
    expect(prisma.task.deleteMany).toHaveBeenCalledWith({ where: { id: { in: [1n, 2n] } } })
    expect(await runInDurableObject(stub, (_instance, state) => readSessionMetadata(state, 'pending'))).toBeNull()
  })

  it.each(['pair', 'reset'] as const)('discards an uncommitted %s after its actor loses membership', async (kind) => {
    let stub = session()
    prisma.group_member.findFirst.mockImplementation(async ({ where }: { where: { user_id: string } }) => (
      where.user_id === 'former-manager' ? null : { id: 'member-1', permission: 'owner' }
    ))
    prisma.pairing.findUnique.mockResolvedValue(null)
    prisma.group.findUnique.mockResolvedValue({ active_pairing_id: kind === 'reset' ? 'old-pairing' : null })
    prisma.task.count.mockResolvedValue(3)
    stub = await seedPending(stub, {
      kind,
      request: { ...request, userId: 'former-manager' },
      ...(kind === 'pair'
        ? {
            pairingId: 'uncommitted-pairing',
            pairs: [{ firstUser: 'alice', secondUser: 'bob', affinity: 5, taskIds: ['1', '2'] }],
          }
        : {}),
    })

    const result = await runInDurableObject(stub, async (instance) => {
      try {
        return await instance.getSnapshot(request)
      }
      catch (error) {
        return error instanceof Error ? error.message : String(error)
      }
    })

    expect(result).toMatchObject({ tasks: [{ id: '1' }, { id: '2' }, { id: '3' }] })
    expect(prisma.pairing.create).not.toHaveBeenCalled()
    expect(prisma.task.deleteMany).not.toHaveBeenCalled()
    expect(await runInDurableObject(stub, (_instance, state) => readSessionMetadata(state, 'pending'))).toBeNull()
  })

  it('completes the WebSocket close handshake at the production compatibility date', async () => {
    const socket = await connect(session())
    const closed = new Promise<CloseEvent>(resolve => socket.addEventListener('close', resolve, { once: true }))

    socket.close(1000, 'done')

    const event = await closed
    expect(event.code).toBe(1000)
    expect(event.reason).toBe('done')
    expect(socket.readyState).toBe(WebSocket.CLOSED)
  })

  it('reports a committed mutation as successful when a notification query fails', async () => {
    const stub = session()
    const socket = await connect(stub)
    const closed = new Promise<CloseEvent>(resolve => socket.addEventListener('close', resolve, { once: true }))
    prisma.group_member.findMany.mockRejectedValueOnce(new Error('Postgres temporarily unavailable'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await stub.upsertTask({ ...request, description: 'Committed task' })).toMatchObject({ success: true })

    expect((await closed).code).toBe(1011)
    socket.close(1000, 'done')
    expect(await runInDurableObject(stub, (_instance, state) => getStoredTasks(state).map(item => item.description))).toEqual(['Committed task'])
    expect(log).toHaveBeenCalledWith('Group session notification failed:', expect.any(Error))
  })

  it('isolates a broken socket while delivering the committed update to other members', async () => {
    const stub = session()
    const broken = await connect(stub)
    const healthy = await connect(stub, 'bob')
    const closed = new Promise<CloseEvent>(resolve => broken.addEventListener('close', resolve, { once: true }))
    const received = new Promise<MessageEvent>(resolve => healthy.addEventListener('message', resolve, { once: true }))
    await runInDurableObject(stub, (_instance, state) => {
      const socket = state.getWebSockets().find((candidate) => {
        const attachment = candidate.deserializeAttachment() as { userId?: string } | null
        return attachment?.userId === 'alice'
      })
      if (socket === undefined) {
        throw new Error('Expected Alice socket')
      }
      vi.spyOn(socket, 'send').mockImplementation(() => {
        throw new Error('Socket send failed')
      })
    })

    expect(await stub.upsertTask({ ...request, description: 'Delivered task' })).toMatchObject({ success: true })

    expect(JSON.parse(String((await received).data))).toMatchObject({ type: 'task:upserted', task: { description: 'Delivered task' } })
    expect((await closed).code).toBe(1011)
    broken.close(1000, 'done')
    healthy.close(1000, 'done')
  })
})
