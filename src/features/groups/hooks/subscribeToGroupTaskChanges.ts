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
}

const groupTaskChannels = new Map<string, GroupTaskChannelEntry>()
const RECONNECT_DELAY_MS = 750

function getRealtimeUrl(groupId: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  return `${protocol}//${window.location.host}/api/group-sessions/${groupId}/realtime`
}

function fanOut(entry: GroupTaskChannelEntry, event: GroupSessionEvent) {
  for (const currentListener of Array.from(entry.listeners)) {
    void Promise.resolve(currentListener(event)).catch((error) => {
      console.error('Error handling group session realtime event', error)
    })
  }
}

function scheduleReconnect(
  groupId: string,
  entry: GroupTaskChannelEntry,
  getToken: GroupSessionTokenLoader,
) {
  if (entry.closed || groupTaskChannels.get(groupId) !== entry || entry.reconnectTimer !== null) {
    return
  }

  entry.reconnectTimer = setTimeout(() => {
    entry.reconnectTimer = null
    void connectGroupSession(groupId, entry, getToken)
  }, RECONNECT_DELAY_MS)
}

async function connectGroupSession(
  groupId: string,
  entry: GroupTaskChannelEntry,
  getToken: GroupSessionTokenLoader,
) {
  let token: string | null
  try {
    token = await getToken()
  }
  catch {
    scheduleReconnect(groupId, entry, getToken)
    return
  }

  if (entry.closed || token === null) {
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
      fanOut(entry, event)
    }
  })

  socket.addEventListener('close', () => {
    if (entry.closed || groupTaskChannels.get(groupId) !== entry) {
      return
    }

    entry.socket = null
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
    }
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

      if (currentEntry.reconnectTimer !== null) {
        clearTimeout(currentEntry.reconnectTimer)
      }

      currentEntry.socket?.close()
    }
  }
}
