import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { produce } from 'immer'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { toTask } from '@/features/groups/lib/groupSessionEvents'
import { createGroupSessionToken } from '@/features/groups/server/groupSessionToken'
import { subscribeToGroupTaskChanges } from './subscribeToGroupTaskChanges'

/**
 * Real-time subscription to tasks updates, inserts, and deletes
 * @param groupId - the group ID to subscribe to
 * @param _currentUserId - the current user ID
 * @param initialTasks - initial tasks to set the state
 * @returns { tasks } - the current tasks
 */
export const useTaskRealtimeListener = (
  groupId: string,
  _currentUserId: string,
  initialTasks?: Task[],
  onPairingCreated?: (pairingId: string) => void,
) => {
  const router = useRouter()
  const createGroupSessionTokenFn = useServerFn(createGroupSessionToken)
  const [tasks, setTasks] = useState<Task[]>(initialTasks || [])
  const tasksRef = useRef<Task[]>(initialTasks || [])
  const onPairingCreatedRef = useRef(onPairingCreated)
  const handledPairingRefreshIdsRef = useRef(new Set<string>())
  const getToken = useCallback(async () => {
    const response = await createGroupSessionTokenFn({ data: { groupId } })

    return response.success ? response.token : null
  }, [createGroupSessionTokenFn, groupId])

  useEffect(() => {
    onPairingCreatedRef.current = onPairingCreated
  }, [onPairingCreated])

  useEffect(() => {
    tasksRef.current = tasks
  }, [tasks])

  useEffect(() => {
    // Reset local realtime state when the loader refreshes for this group.
    // eslint-disable-next-line react/set-state-in-effect
    setTasks(initialTasks ?? [])
    tasksRef.current = initialTasks ?? []
  }, [groupId, initialTasks])

  useEffect(() => {
    handledPairingRefreshIdsRef.current.clear()
  }, [groupId])

  const handleTaskUpdate = (task: Task) => {
    setTasks(current =>
      produce(current, (draft) => {
        const index = draft.findIndex(currentTask => currentTask.id === task.id)
        if (index !== -1) {
          draft[index] = {
            ...draft[index],
            ...task,
            helpCapacity: draft[index].helpCapacity,
          }
        }
      }),
    )
  }

  const handleTaskUpsert = (task: Task) => {
    setTasks(current =>
      produce(current, (draft) => {
        const existingIndex = draft.findIndex(currentTask => currentTask.id === task.id)
        const nextTask = {
          ...task,
          helpCapacity: existingIndex === -1 ? null : draft[existingIndex]?.helpCapacity ?? null,
          ratingsCompletedCount: existingIndex === -1 ? 0 : draft[existingIndex]?.ratingsCompletedCount ?? 0,
          ratingsCompletionOrder: existingIndex === -1 ? null : draft[existingIndex]?.ratingsCompletionOrder ?? null,
        } satisfies Task

        if (existingIndex !== -1) {
          draft[existingIndex] = nextTask
          return
        }

        draft.push(nextTask)
      }),
    )
  }

  const handleTaskDelete = (taskId: string) => {
    setTasks(current =>
      produce(current, (draft) => {
        const index = draft.findIndex(task => task.id === taskId)
        if (index !== -1) {
          draft.splice(index, 1)
        }
      }),
    )
  }

  const handleRatingProgressUpdate = (event: Extract<GroupSessionEvent, { type: 'ratings:updated' }>) => {
    setTasks(current =>
      produce(current, (draft) => {
        const index = draft.findIndex(task => task.userId === event.userId)
        if (index !== -1) {
          draft[index] = {
            ...draft[index],
            ratingsCompletedCount: event.ratingsCompletedCount,
            ratingsCompletionOrder: event.ratingsCompletionOrder,
          }
        }
      }),
    )
  }

  const taskSubscriptionHandler = async (event: GroupSessionEvent) => {
    switch (event.type) {
      case 'snapshot':
        setTasks(event.tasks.map(toTask))
        break
      case 'task:upserted': {
        const task = toTask(event.task)
        if (tasksRef.current.some(currentTask => currentTask.id === task.id)) {
          handleTaskUpdate(task)
        }
        else {
          handleTaskUpsert(task)
        }
        break
      }
      case 'task:deleted':
        handleTaskDelete(event.taskId)
        break
      case 'pairing:created':
        if (!handledPairingRefreshIdsRef.current.has(event.pairingId)) {
          handledPairingRefreshIdsRef.current.add(event.pairingId)
          onPairingCreatedRef.current?.(event.pairingId)
          toast.success('Pairs were created. Refreshing...')
          await router.invalidate()
        }
        break
      case 'pool:reset':
        setTasks([])
        await router.invalidate()
        break
      case 'ratings:updated':
        handleRatingProgressUpdate(event)
        break
      default:
        break
    }
  }

  useEffect(() => {
    return subscribeToGroupTaskChanges(groupId, getToken, taskSubscriptionHandler)
    // Ignore async function as dependency
    // eslint-disable-next-line react/exhaustive-deps
  }, [groupId, getToken])

  return { tasks }
}
