import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useRouter } from '@tanstack/react-router'
import { produce } from 'immer'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/shared/supabase/client'

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

    const taskId = (payload.new as { id?: string }).id ?? (payload.old as { id?: string }).id ?? ''
    const userId = (payload.new as { user_id?: string }).user_id ?? (payload.old as { user_id?: string }).user_id ?? ''

    if (taskId === undefined || taskId === '') {
      console.warn('Task ID is undefined or empty')
      return
    }

    if (userId === currentUserId || userId === '') {
      return
    }

    // ! Supabase currently does not support DELETE event
    // ! We are using the `delete_pending` column to mark the task as deleted
    if (eventType === 'DELETE') {
      handleTaskDelete(taskId)
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
      handleTaskDelete(taskRaw.id)
    }

    // When a pairing is created, the task is deleted from the current user
    // and refresh the page to show the new pairing
    if (taskRaw.pairing_id !== null) {
      toast.success('Task paired with another user! Refreshing...')
      handleTaskDelete(taskRaw.id)
      await router.invalidate()
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
    const subscription = supabase
      .channel(`realtime-single-group-others-tasks:${groupId}:${currentUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task',
        filter: `group_id=eq.${groupId}`,
      }, taskSubscriptionHandler)
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
    // Ignore async function as dependency
    // eslint-disable-next-line react/exhaustive-deps
  }, [supabase, groupId])

  return { tasks }
}
