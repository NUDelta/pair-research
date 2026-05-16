import { describe, expect, it } from 'vitest'
import { parseGroupSessionEvent, toTask } from './groupSessionEvents'

describe('groupSessionEvents', () => {
  it('parses known group session events', () => {
    expect(parseGroupSessionEvent(JSON.stringify({
      type: 'ratings:updated',
      taskIds: ['task-1'],
      userId: 'user-1',
      ratingsCompletedCount: 2,
      ratingsCompletionOrder: 10,
    }))).toEqual({
      type: 'ratings:updated',
      taskIds: ['task-1'],
      userId: 'user-1',
      ratingsCompletedCount: 2,
      ratingsCompletionOrder: 10,
    })
  })

  it('rejects malformed events', () => {
    expect(parseGroupSessionEvent('not json')).toBeNull()
    expect(parseGroupSessionEvent(JSON.stringify({ type: 'ratings:updated' }))).toBeNull()
  })

  it('maps group session tasks to UI tasks', () => {
    expect(toTask({
      id: 'task-1',
      description: 'Review draft',
      userId: 'user-1',
      fullName: 'Ada',
      avatarUrl: null,
      helpCapacity: 4,
      ratingsCompletedCount: 2,
      ratingsCompletionOrder: 8,
    })).toEqual({
      id: 'task-1',
      description: 'Review draft',
      userId: 'user-1',
      fullName: 'Ada',
      avatarUrl: null,
      helpCapacity: 4,
      ratingsCompletedCount: 2,
      ratingsCompletionOrder: 8,
    })
  })
})
