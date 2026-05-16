import type { GroupSessionEvent } from '../lib/groupSessionEvents'
import { describe, expect, it } from 'vitest'
import { isRelevantRatingProgressPayload } from './useRatingProgressRealtimeRefresh'

describe('useRatingProgressRealtimeRefresh helpers', () => {
  it('matches rating events for tracked task ids', () => {
    const event: GroupSessionEvent = {
      type: 'ratings:updated',
      taskIds: ['task-1'],
    }

    expect(isRelevantRatingProgressPayload(event, ['task-1', 'task-2'])).toBe(true)
    expect(isRelevantRatingProgressPayload(event, ['task-3'])).toBe(false)
  })

  it('ignores non-rating events', () => {
    expect(isRelevantRatingProgressPayload({
      type: 'pool:reset',
    }, ['task-1'])).toBe(false)
  })
})
