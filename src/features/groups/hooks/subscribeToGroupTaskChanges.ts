import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { createClient } from '@/shared/supabase/client'

type TaskRealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>
type TaskRealtimeListener = (payload: TaskRealtimePayload) => void | Promise<void>

interface GroupTaskChannelEntry {
  channel: RealtimeChannel
  listeners: Set<TaskRealtimeListener>
}

const groupTaskChannels = new Map<string, GroupTaskChannelEntry>()

export function subscribeToGroupTaskChanges(groupId: string, listener: TaskRealtimeListener) {
  let entry = groupTaskChannels.get(groupId)

  if (entry === undefined) {
    const supabase = createClient()
    const listeners = new Set<TaskRealtimeListener>()
    const channel = supabase
      .channel(`realtime-group-tasks:${groupId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task',
        filter: `group_id=eq.${groupId}`,
      }, (payload) => {
        for (const currentListener of Array.from(listeners)) {
          void Promise.resolve(currentListener(payload)).catch((error) => {
            console.error('Error handling group task realtime payload', error)
          })
        }
      })
      .subscribe()

    entry = { channel, listeners }
    groupTaskChannels.set(groupId, entry)
  }

  entry.listeners.add(listener)

  return () => {
    const currentEntry = groupTaskChannels.get(groupId)
    if (currentEntry === undefined) {
      return
    }

    currentEntry.listeners.delete(listener)

    if (currentEntry.listeners.size === 0) {
      groupTaskChannels.delete(groupId)
      void createClient().removeChannel(currentEntry.channel)
    }
  }
}
