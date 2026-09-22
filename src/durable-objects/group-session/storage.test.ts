import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import {
  consumeStoredActionRateLimit,
  getStoredRatings,
  getStoredTasks,
  initializeGroupSessionStorage,
  removeStoredMemberState,
  retainStoredMembers,
  upsertStoredRatingUpdates,
  upsertStoredTask,
} from './storage'

function createState(): DurableObjectState {
  const database = new DatabaseSync(':memory:')
  const exec = <Row extends Record<string, SqlStorageValue>>(sql: string, ...bindings: SqlStorageValue[]) => {
    if (bindings.length === 0 && /;|create table/i.test(sql)) {
      database.exec(sql)
      return { one: () => undefined as unknown as Row, toArray: () => [] as Row[] }
    }

    const statement = database.prepare(sql)
    const sqlBindings = bindings.map(binding => binding instanceof ArrayBuffer ? new Uint8Array(binding) : binding)
    const rows = statement.all(...sqlBindings) as Row[]
    return {
      one: () => rows[0],
      toArray: () => rows,
    }
  }

  return {
    storage: {
      sql: { exec },
    },
  } as unknown as DurableObjectState
}

function addTask(ctx: DurableObjectState, id: string, userId: string) {
  upsertStoredTask(ctx, {
    id,
    user_id: userId,
    description: `${userId} task`,
    full_name: userId,
    avatar_url: null,
    created_at: '2026-09-21T00:00:00.000Z',
    updated_at: '2026-09-21T00:00:00.000Z',
  })
}

describe('removed-member group session reconciliation', () => {
  it('removes the member task, their ratings, and ratings targeting their task', () => {
    const ctx = createState()
    initializeGroupSessionStorage(ctx)
    addTask(ctx, 'task-removed', 'removed-user')
    addTask(ctx, 'task-member', 'current-user')
    upsertStoredRatingUpdates(ctx, 'removed-user', [{ taskId: 'task-member', capacity: 5 }])
    upsertStoredRatingUpdates(ctx, 'current-user', [{ taskId: 'task-removed', capacity: 4 }])

    expect(removeStoredMemberState(ctx, 'removed-user')).toEqual(['task-removed'])
    expect(getStoredTasks(ctx).map(task => task.user_id)).toEqual(['current-user'])
    expect(getStoredRatings(ctx)).toEqual([])
  })

  it('prunes stale users deterministically immediately before pairing', () => {
    const ctx = createState()
    initializeGroupSessionStorage(ctx)
    addTask(ctx, 'task-stale', 'removed-user')
    addTask(ctx, 'task-current', 'current-user')
    upsertStoredRatingUpdates(ctx, 'removed-user', [{ taskId: 'task-current', capacity: 5 }])

    expect(retainStoredMembers(ctx, new Set(['current-user']))).toEqual(['removed-user'])
    expect(getStoredTasks(ctx).map(task => task.id)).toEqual(['task-current'])
    expect(getStoredRatings(ctx)).toEqual([])
  })
})

describe('durable group session rate limits', () => {
  it('persists per-user action limits and expires the window', () => {
    const ctx = createState()
    initializeGroupSessionStorage(ctx)
    const input = {
      action: 'task_write',
      limit: 2,
      userId: 'member-1',
      windowMs: 60_000,
    }

    expect(consumeStoredActionRateLimit(ctx, input, 1_000)).toBe(true)
    expect(consumeStoredActionRateLimit(ctx, input, 2_000)).toBe(true)
    expect(consumeStoredActionRateLimit(ctx, input, 3_000)).toBe(false)
    expect(consumeStoredActionRateLimit(ctx, input, 62_001)).toBe(true)
  })

  it('does not let one user exhaust another user action budget', () => {
    const ctx = createState()
    initializeGroupSessionStorage(ctx)

    expect(consumeStoredActionRateLimit(ctx, {
      action: 'pairing_write',
      limit: 1,
      userId: 'manager-1',
      windowMs: 60_000,
    }, 1_000)).toBe(true)
    expect(consumeStoredActionRateLimit(ctx, {
      action: 'pairing_write',
      limit: 1,
      userId: 'manager-2',
      windowMs: 60_000,
    }, 1_001)).toBe(true)
  })
})
