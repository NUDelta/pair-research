import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import { parseGroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import { GROUP_SESSION_WEBSOCKET_PROTOCOL } from '@/features/groups/lib/groupSessionProtocol'

type GroupSessionEventListener = (event: GroupSessionEvent) => void | Promise<void>
type GroupSessionTokenLoader = () => Promise<string | null>

interface GroupTaskChannelEntry {
  listeners: Set<GroupSessionEventListener>
  socket: WebSocket | null
  reconnectTimer: ReturnType<typeof setTimeout> | null
  closed: boolean
  connecting: boolean
  reconnectAttempt: number
  onOnline: () => void
}

const groupTaskChannels = new Map<string, GroupTaskChannelEntry>()
const RECONNECT_DELAY_MS = 750
const MAX_RECONNECT_DELAY_MS = 30_000

function getRealtimeUrl(groupId: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  return `${protocol}//${window.location.host}/api/group-sessions/${groupId}/realtime`
}

function fanOut(entry: GroupTaskChannelEntry, event: GroupSessionEvent) {
  for (const currentListener of Array.from(entry.listeners)) {
    void Promise.resolve().then(async () => currentListener(event)).catch((error) => {
      console.error('Error handling group session realtime event', error)
    })
  }
}

function scheduleReconnect(
  groupId: string,
  entry: GroupTaskChannelEntry,
  getToken: GroupSessionTokenLoader,
) {
  if (entry.closed || groupTaskChannels.get(groupId) !== entry || entry.reconnectTimer !== null || !navigator.onLine) {
    return
  }

  const delay = Math.min(MAX_RECONNECT_DELAY_MS, RECONNECT_DELAY_MS * 2 ** Math.min(entry.reconnectAttempt, 6))
    * (0.5 + Math.random() / 2)
  entry.reconnectAttempt += 1
  entry.reconnectTimer = setTimeout(() => {
    entry.reconnectTimer = null
    void connectGroupSession(groupId, entry, getToken)
  }, delay)
}

async function connectGroupSession(
  groupId: string,
  entry: GroupTaskChannelEntry,
  getToken: GroupSessionTokenLoader,
) {
  if (entry.closed || entry.connecting || entry.socket !== null || !navigator.onLine) {
    return
  }
  entry.connecting = true
  let token: string | null
  try {
    token = await getToken()
  }
  catch {
    entry.connecting = false
    scheduleReconnect(groupId, entry, getToken)
    return
  }

  entry.connecting = false
  if (entry.closed || groupTaskChannels.get(groupId) !== entry || token === null) {
    return
  }

  let socket: WebSocket
  try {
    socket = new WebSocket(getRealtimeUrl(groupId), [GROUP_SESSION_WEBSOCKET_PROTOCOL, token])
  }
  catch {
    scheduleReconnect(groupId, entry, getToken)
    return
  }
  entry.socket = socket

  socket.addEventListener('message', (message) => {
    if (typeof message.data !== 'string') {
      return
    }

    const event = parseGroupSessionEvent(message.data)
    if (event !== null) {
      if (event.type === 'snapshot') {
        entry.reconnectAttempt = 0
      }
      fanOut(entry, event)
    }
  })

  socket.addEventListener('close', (event) => {
    if (entry.closed || groupTaskChannels.get(groupId) !== entry) {
      return
    }

    entry.socket = null
    if (event.code === 1008) {
      entry.closed = true
      return
    }
    scheduleReconnect(groupId, entry, getToken)
  })

  socket.addEventListener('error', () => {
    socket.close()
  })
}

/**
 * Keeps one browser Durable Object socket per group tab and fans events out to every
 * groups hook that cares about the same task stream.
 */
export function subscribeToGroupTaskChanges(
  groupId: string,
  getToken: GroupSessionTokenLoader,
  listener: GroupSessionEventListener,
) {
  let entry = groupTaskChannels.get(groupId)

  if (entry === undefined) {
    const listeners = new Set<GroupSessionEventListener>()

    entry = {
      listeners,
      socket: null,
      reconnectTimer: null,
      closed: false,
      connecting: false,
      reconnectAttempt: 0,
      onOnline: () => {},
    }
    const currentEntry = entry
    entry.onOnline = () => {
      if (currentEntry.reconnectTimer !== null) {
        clearTimeout(currentEntry.reconnectTimer)
        currentEntry.reconnectTimer = null
      }
      void connectGroupSession(groupId, currentEntry, getToken)
    }
    window.addEventListener('online', entry.onOnline)
    groupTaskChannels.set(groupId, entry)
    void connectGroupSession(groupId, entry, getToken)
  }

  entry.listeners.add(listener)

  return () => {
    const currentEntry = groupTaskChannels.get(groupId)
    if (currentEntry === undefined) {
      return
    }

    currentEntry.listeners.delete(listener)

    if (currentEntry.listeners.size === 0) {
      currentEntry.closed = true
      groupTaskChannels.delete(groupId)
      window.removeEventListener('online', currentEntry.onOnline)

      if (currentEntry.reconnectTimer !== null) {
        clearTimeout(currentEntry.reconnectTimer)
      }

      currentEntry.socket?.close()
    }
  }
}
