import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import { useServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useState } from 'react'
import { createGroupSessionToken } from '@/features/groups/server/groupSessionToken'
import { subscribeToGroupTaskChanges } from './subscribeToGroupTaskChanges'

export const useCurrentUserTaskDescription = (
  groupId: string,
  currentUserId: string,
  initialDescription?: string | null,
) => {
  const createGroupSessionTokenFn = useServerFn(createGroupSessionToken)
  const [currentDescription, setCurrentDescription] = useState<string | null>(initialDescription ?? null)
  const getToken = useCallback(async () => {
    const response = await createGroupSessionTokenFn({ data: { groupId } })

    return response.success ? response.token : null
  }, [createGroupSessionTokenFn, groupId])

  useEffect(() => {
    // Mirror loader refreshes into local realtime state.
    // eslint-disable-next-line react/set-state-in-effect
    setCurrentDescription(initialDescription ?? null)
  }, [initialDescription])

  const handleUpsert = async (event: GroupSessionEvent) => {
    if (event.type === 'snapshot') {
      const currentUserTask = event.tasks.find(task => task.userId === currentUserId)
      setCurrentDescription(currentUserTask?.description ?? null)
    }

    if (event.type === 'task:upserted' && event.task.userId === currentUserId) {
      setCurrentDescription(event.task.description)
    }

    if (event.type === 'task:deleted' && event.userId === currentUserId) {
      setCurrentDescription(null)
    }

    if (event.type === 'pool:reset') {
      setCurrentDescription(null)
    }
  }

  useEffect(() => {
    return subscribeToGroupTaskChanges(groupId, getToken, handleUpsert)
    // eslint-disable-next-line react/exhaustive-deps
  }, [groupId, currentUserId, getToken])

  return { currentDescription, setCurrentDescription }
}
