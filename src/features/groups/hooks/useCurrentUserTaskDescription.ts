import type { TaskRealtimePayload } from './taskRealtimePayload'
import { useEffect, useState } from 'react'
import { createClient } from '@/shared/supabase/client'
import { subscribeToGroupTaskChanges } from './subscribeToGroupTaskChanges'
import { parseTaskRealtimeRow } from './taskRealtimePayload'

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

  const handleUpsert = async (payload: TaskRealtimePayload) => {
    const updatedTask = parseTaskRealtimeRow(payload.new)
    if (updatedTask === null) {
      return
    }

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
    return subscribeToGroupTaskChanges(groupId, handleUpsert)
    // eslint-disable-next-line react/exhaustive-deps
  }, [groupId, currentUserId])

  return { currentDescription, setCurrentDescription }
}
