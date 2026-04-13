import { describe, expect, it } from 'vitest'
import { getTaskRealtimeIdentity, parseTaskRealtimeRow } from './taskRealtimePayload'

describe('taskRealtimePayload', () => {
  it('parses a full task row from realtime payload data', () => {
    expect(parseTaskRealtimeRow({
      id: 12,
      description: 'Review the conclusion',
      user_id: 'user-2',
      group_id: 'group-1',
      created_at: '2026-04-13T17:00:00.000Z',
      pairing_id: null,
      delete_pending: true,
    })).toEqual({
      id: '12',
      description: 'Review the conclusion',
      user_id: 'user-2',
      group_id: 'group-1',
      created_at: '2026-04-13T17:00:00.000Z',
      pairing_id: null,
      delete_pending: true,
    })
  })

  it('returns null for partial realtime rows', () => {
    expect(parseTaskRealtimeRow({
      id: 'task-1',
      description: 'Missing fields',
    })).toBeNull()
  })

  it('extracts ids from update payloads that only include the previous row', () => {
    expect(getTaskRealtimeIdentity({
      eventType: 'DELETE',
      schema: 'public',
      table: 'task',
      commit_timestamp: '2026-04-13T17:00:00.000Z',
      errors: [],
      new: {},
      old: {
        id: 'task-1',
        user_id: 'user-2',
        pairing_id: 'pairing-7',
      },
    })).toEqual({
      taskId: 'task-1',
      userId: 'user-2',
      previousPairingId: 'pairing-7',
    })
  })
})
