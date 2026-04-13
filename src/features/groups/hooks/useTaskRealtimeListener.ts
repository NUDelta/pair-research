import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useRouter } from '@tanstack/react-router'
import { produce } from 'immer'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/shared/supabase/client'
import { subscribeToGroupTaskChanges } from './subscribeToGroupTaskChanges'

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
    const isProfileRecord = (
      value: unknown,
    ): value is { id: string, full_name: string | null, avatar_url: string | null } => {
      return typeof value === 'object' && value !== null && 'id' in value && 'full_name' in value && 'avatar_url' in value
    }

    const { data: profile, error } = await supabase
      .from('profile')
      .select('id, full_name, avatar_url')
      .eq('id', taskRaw.user_id)
      .single()

    if (error || !isProfileRecord(profile)) {
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

  const taskSubscriptionHandler = async (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
    const eventType = payload.eventType

    const taskIdRaw = (payload.new as { id?: unknown }).id ?? (payload.old as { id?: unknown }).id
    const userIdRaw = (payload.new as { user_id?: unknown }).user_id ?? (payload.old as { user_id?: unknown }).user_id
    const taskId = taskIdRaw !== undefined && taskIdRaw !== null ? String(taskIdRaw) : ''
    const userId = userIdRaw !== undefined && userIdRaw !== null ? String(userIdRaw) : ''
    const previousPairingIdRaw = (payload.old as { pairing_id?: unknown }).pairing_id
    const previousPairingId = previousPairingIdRaw !== undefined && previousPairingIdRaw !== null
      ? String(previousPairingIdRaw)
      : null

    if (taskId === undefined || taskId === '') {
      console.warn('Task ID is undefined or empty')
      return
    }

    // ! Supabase currently does not support DELETE event
    // ! We are using the `delete_pending` column to mark the task as deleted
    if (eventType === 'DELETE') {
      if (userId !== currentUserId && userId !== '') {
        handleTaskDelete(taskId)
      }
      return
    }

    const taskRaw: TaskRow = {
      id: taskId,
      description: String(payload.new.description),
      user_id: userId,
      group_id: String(payload.new.group_id),
      created_at: String(payload.new.created_at),
      pairing_id: payload.new.pairing_id !== null ? String(payload.new.pairing_id) : null,
      delete_pending: payload.new.delete_pending !== null ? Boolean(payload.new.delete_pending) : null,
    }

    if (taskRaw.delete_pending === true) {
      if (userId !== currentUserId && userId !== '') {
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
      if (userId !== currentUserId && userId !== '') {
        toast.success('Task paired with another user! Refreshing...')
        handleTaskDelete(taskRaw.id)
      }
      await router.invalidate()
      return
    }

    if (userId === currentUserId || userId === '') {
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
