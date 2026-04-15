import type { TaskRealtimePayload } from './taskRealtimePayload'
import { useRouter } from '@tanstack/react-router'
import { produce } from 'immer'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/shared/supabase/client'
import { subscribeToGroupTaskChanges } from './subscribeToGroupTaskChanges'
import { getTaskRealtimeIdentity, isTaskProfileRecord, parseTaskRealtimeRow } from './taskRealtimePayload'

/**
 * Real-time subscription to tasks updates, inserts, and deletes
 * @param groupId - the group ID to subscribe to
 * @param currentUserId - the current user ID
 * @param initialTasks - initial tasks to set the state
 * @returns { tasks } - the current tasks
 */
export const useTaskRealtimeListener = (
  groupId: string,
  currentUserId: string,
  initialTasks?: Task[],
) => {
  const router = useRouter()
  const supabase = createClient()
  const [tasks, setTasks] = useState<Task[]>(initialTasks || [])

  useEffect(() => {
    // Reset local realtime state when the loader refreshes for this group.
    // eslint-disable-next-line react/set-state-in-effect
    setTasks(initialTasks ?? [])
  }, [groupId, initialTasks])

  /**
   * Handle task updates in the database
   * @param taskRaw
   */
  const handleTaskUpdate = (taskRaw: TaskRow) => {
    setTasks(current =>
      produce(current, (draft) => {
        const index = draft.findIndex(task => task.id === taskRaw.id)
        if (index !== -1 && taskRaw.description !== undefined) {
          draft[index].description = taskRaw.description
        }
      }),
    )
  }

  /**
   * Handle new task inserts to the database
   *
   * TODO: when there is no initial tasks, this will not work
   * @param taskRaw
   */
  const handleTaskInsert = async (taskRaw: TaskRow) => {
    const { data: profile, error } = await supabase
      .from('profile')
      .select('id, full_name, avatar_url')
      .eq('id', taskRaw.user_id)
      .single()

    if (error || !isTaskProfileRecord(profile)) {
      console.error(`Error fetching profile for the task: ${taskRaw.description}`, error)
      return
    }

    setTasks(current =>
      produce(current, (draft) => {
        const existingIndex = draft.findIndex(task => task.id === taskRaw.id)
        const nextTask = {
          id: taskRaw.id,
          description: taskRaw.description,
          userId: String(profile.id),
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
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

  /**
   * Handle task deletes in the database
   * @param taskId
   */
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

  const taskSubscriptionHandler = async (payload: TaskRealtimePayload) => {
    const eventType = payload.eventType
    const {
      taskId,
      userId,
      previousPairingId,
    } = getTaskRealtimeIdentity(payload)

    if (taskId === null || taskId.length === 0) {
      console.warn('Task ID is undefined or empty')
      return
    }

    // ! Supabase currently does not support DELETE event
    // ! We are using the `delete_pending` column to mark the task as deleted
    if (eventType === 'DELETE') {
      if (userId !== currentUserId && userId !== null && userId.length > 0) {
        handleTaskDelete(taskId)
      }
      return
    }

    const taskRaw = parseTaskRealtimeRow(payload.new)
    if (taskRaw === null) {
      return
    }

    if (taskRaw.delete_pending === true) {
      if (userId !== currentUserId && userId !== null && userId.length > 0) {
        handleTaskDelete(taskRaw.id)
      }

      if (previousPairingId !== null) {
        await router.invalidate()
      }
      return
    }

    // When a pairing is created, the task is deleted from the current user
    // and refresh the page to show the new pairing
    if (taskRaw.pairing_id !== null) {
      if (userId !== currentUserId && userId !== null && userId.length > 0) {
        toast.success('Task paired with another user! Refreshing...')
        handleTaskDelete(taskRaw.id)
      }
      await router.invalidate()
      return
    }

    if (userId === currentUserId || userId === null || userId.length === 0) {
      return
    }

    switch (eventType) {
      case 'INSERT':
        await handleTaskInsert(taskRaw)
        break
      case 'UPDATE':
        handleTaskUpdate(taskRaw)
        break
      default:
        console.error('Unknown event type: ', eventType)
        break
    }
  }

  useEffect(() => {
    return subscribeToGroupTaskChanges(groupId, taskSubscriptionHandler)
    // Ignore async function as dependency
    // eslint-disable-next-line react/exhaustive-deps
  }, [groupId, currentUserId])

  return { tasks }
}
