import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupSessionDO } from './group-session-do'
import { upsertStoredTask } from './group-session/storage'

const mocks = vi.hoisted(() => ({
  prisma: {
    group_member: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('./group-session/database', () => ({
  getMembership: vi.fn(),
  getPrisma: vi.fn(async () => mocks.prisma),
}))

function createState(sockets: WebSocket[]): DurableObjectState {
  const database = new DatabaseSync(':memory:')
  const sql = {
    exec<Row extends Record<string, SqlStorageValue>>(query: string, ...bindings: SqlStorageValue[]) {
      if (bindings.length === 0 && /;|create table/i.test(query)) {
        database.exec(query)
        return { one: () => undefined as unknown as Row, toArray: () => [] as Row[] }
      }
      const sqlBindings = bindings.map(binding => binding instanceof ArrayBuffer ? new Uint8Array(binding) : binding)
      const rows = database.prepare(query).all(...sqlBindings) as Row[]
      return { one: () => rows[0], toArray: () => rows }
    },
  }

  return {
    blockConcurrencyWhile: vi.fn(async (callback: () => Promise<void>) => callback()),
    getWebSockets: vi.fn(() => sockets),
    storage: { sql },
  } as unknown as DurableObjectState
}

function socketFor(userId: string) {
  const close = vi.fn()
  const socket = {
    close,
    deserializeAttachment: vi.fn(() => ({ userId })),
    send: vi.fn(),
  } as unknown as WebSocket

  return { close, socket }
}

describe('groupSessionDO membership revocation', () => {
  beforeEach(() => {
    mocks.prisma.group_member.findFirst.mockResolvedValue(null)
    mocks.prisma.group_member.findMany.mockResolvedValue([])
  })

  it('closes an existing socket and removes stale pool state after membership deletion', async () => {
    const { close, socket: removedSocket } = socketFor('removed-user')
    const state = createState([removedSocket])
    const session = new GroupSessionDO(state, {} as Cloudflare.Env)
    upsertStoredTask(state, {
      id: 'task-removed',
      user_id: 'removed-user',
      description: 'stale task',
      full_name: null,
      avatar_url: null,
      created_at: '2026-09-21T00:00:00.000Z',
      updated_at: '2026-09-21T00:00:00.000Z',
    })

    await expect(session.reconcileRemovedMember({
      groupId: 'group-1',
      userId: 'removed-user',
    })).resolves.toMatchObject({ success: true })
    expect(close).toHaveBeenCalledWith(1008, 'Group membership revoked')
  })

  it('refuses reconciliation while membership still exists', async () => {
    mocks.prisma.group_member.findFirst.mockResolvedValueOnce({ id: 1n })
    const state = createState([])
    const session = new GroupSessionDO(state, {} as Cloudflare.Env)

    await expect(session.reconcileRemovedMember({
      groupId: 'group-1',
      userId: 'current-user',
    })).resolves.toEqual({ success: false, message: 'Group membership still exists' })
  })
})
