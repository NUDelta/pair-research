import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { createClient } from '@/shared/supabase/client'

function asRecord(value: unknown) {
  return typeof value === 'object' && value !== null
    ? value as Record<string, unknown>
    : null
}

function getChangedTaskId(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) {
  const nextRow = asRecord(payload.new)
  const previousRow = asRecord(payload.old)
  const taskId = nextRow?.task_id ?? previousRow?.task_id

  return taskId === undefined || taskId === null ? null : String(taskId)
}

export function isRelevantRatingProgressPayload(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  taskIds: string[],
) {
  const taskId = getChangedTaskId(payload)

  return taskId !== null && taskIds.includes(taskId)
}

export function useRatingProgressRealtimeRefresh(groupId: string, taskIds: string[]) {
  const router = useRouter()
  const taskIdsKey = taskIds.join('|')

  useEffect(() => {
    const trackedTaskIds = taskIdsKey.length === 0 ? [] : taskIdsKey.split('|')

    if (trackedTaskIds.length === 0) {
      return
    }

    const supabase = createClient()
    let invalidateTimer: ReturnType<typeof setTimeout> | undefined

    const channel = supabase
      .channel(`realtime-group-ratings:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_help_capacity',
      }, (payload) => {
        if (!isRelevantRatingProgressPayload(payload, trackedTaskIds)) {
          return
        }

        if (invalidateTimer !== undefined) {
          clearTimeout(invalidateTimer)
        }

        invalidateTimer = setTimeout(() => {
          void router.invalidate()
        }, 100)
      })
      .subscribe()

    return () => {
      if (invalidateTimer !== undefined) {
        clearTimeout(invalidateTimer)
      }

      void supabase.removeChannel(channel)
    }
  }, [groupId, router, taskIdsKey])
}
