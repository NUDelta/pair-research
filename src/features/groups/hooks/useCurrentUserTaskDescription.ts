import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { createClient } from '@/shared/supabase/client'

export const useCurrentUserTaskDescription = (
  groupId: string,
  currentUserId: string,
  initialDescription?: string | null,
) => {
  const supabase = createClient()
  const [currentDescription, setCurrentDescription] = useState<string | null>(initialDescription ?? null)

  useEffect(() => {
    // Mirror loader refreshes into local realtime state.
    // eslint-disable-next-line react/set-state-in-effect
    setCurrentDescription(initialDescription ?? null)
  }, [initialDescription])

  const isValidTaskRow = (data: unknown): data is TaskRow => {
    return (
      typeof data === 'object'
      && data !== null
      && 'id' in data
      && 'description' in data
      && 'user_id' in data
      && 'group_id' in data
      && 'pairing_id' in data
      && 'created_at' in data
    )
  }

  const handleUpsert = async (payload: RealtimePostgresChangesPayload<{ [key: string]: any }>) => {
    if (!isValidTaskRow(payload.new)) {
      return
    }

    const updatedTask: TaskRow = {
      id: String(payload.new.id),
      description: String(payload.new.description),
      user_id: String(payload.new.user_id),
      group_id: String(payload.new.group_id),
      created_at: String(payload.new.created_at),
      pairing_id: payload.new.pairing_id !== null ? String(payload.new.pairing_id) : null,
      delete_pending: payload.new.delete_pending !== null ? Boolean(payload.new.delete_pending) : null,
    } satisfies TaskRow

    if (updatedTask.group_id !== groupId || updatedTask.user_id !== currentUserId || updatedTask.pairing_id !== null) {
      return
    }

    // Soft-delete logic
    if (updatedTask.delete_pending === true) {
      setCurrentDescription(null)
      // 1 seconds delay to actual delete this row in the database
      setTimeout(async () => {
        const { error } = await supabase
          .from('task')
          .delete()
          .eq('id', updatedTask.id)
          .eq('user_id', updatedTask.user_id)
          .eq('group_id', updatedTask.group_id)
          .eq('delete_pending', true)
        if (error) {
          console.error(`Error deleting task: ${updatedTask.description}`, error)
        }
      }, 500)
      return
    }

    setCurrentDescription(updatedTask.description)
  }

  useEffect(() => {
    const channel = supabase
      .channel(`realtime-my-task:${groupId}:${currentUserId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task',
        filter: `user_id=eq.${currentUserId}`,
      }, handleUpsert)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react/exhaustive-deps
  }, [supabase, groupId, currentUserId])

  return { currentDescription, setCurrentDescription }
}
