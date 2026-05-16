import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useCallback, useEffect } from 'react'
import { createGroupSessionToken } from '@/features/groups/server/groupSessionToken'
import { subscribeToGroupTaskChanges } from './subscribeToGroupTaskChanges'

export function isRelevantRatingProgressPayload(
  event: GroupSessionEvent,
  taskIds: string[],
) {
  return event.type === 'ratings:updated' && event.taskIds.some(taskId => taskIds.includes(taskId))
}

export function useRatingProgressRealtimeRefresh(groupId: string, taskIds: string[]) {
  const router = useRouter()
  const createGroupSessionTokenFn = useServerFn(createGroupSessionToken)
  const taskIdsKey = taskIds.join('|')
  const getToken = useCallback(async () => {
    const response = await createGroupSessionTokenFn({ data: { groupId } })

    return response.success ? response.token : null
  }, [createGroupSessionTokenFn, groupId])

  useEffect(() => {
    const trackedTaskIds = taskIdsKey.length === 0 ? [] : taskIdsKey.split('|')

    if (trackedTaskIds.length === 0) {
      return
    }

    let invalidateTimer: ReturnType<typeof setTimeout> | undefined

    const unsubscribe = subscribeToGroupTaskChanges(groupId, getToken, (event) => {
      if (!isRelevantRatingProgressPayload(event, trackedTaskIds)) {
        return
      }

      if (invalidateTimer !== undefined) {
        clearTimeout(invalidateTimer)
      }

      invalidateTimer = setTimeout(() => {
        void router.invalidate()
      }, 100)
    })

    return () => {
      if (invalidateTimer !== undefined) {
        clearTimeout(invalidateTimer)
      }

      unsubscribe()
    }
  }, [getToken, groupId, router, taskIdsKey])
}
