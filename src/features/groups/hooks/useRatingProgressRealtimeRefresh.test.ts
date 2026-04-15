import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { isRelevantRatingProgressPayload } from './useRatingProgressRealtimeRefresh'

describe('useRatingProgressRealtimeRefresh helpers', () => {
  it('matches payloads for tracked task ids', () => {
    const payload = {
      schema: 'public',
      table: 'task_help_capacity',
      commit_timestamp: '',
      eventType: 'INSERT',
      errors: [],
      new: { task_id: 'task-1' },
      old: {},
    } satisfies RealtimePostgresChangesPayload<Record<string, unknown>>

    expect(isRelevantRatingProgressPayload(payload, ['task-1', 'task-2'])).toBe(true)
    expect(isRelevantRatingProgressPayload(payload, ['task-3'])).toBe(false)
  })
})
