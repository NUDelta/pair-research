export interface GroupSessionTask {
  id: string
  description: string
  userId: string
  fullName: string | null
  avatarUrl: string | null
  helpCapacity: number | null
  ratingsCompletedCount: number
  ratingsCompletionOrder: number | null
}

export type GroupSessionEvent
  = | {
    type: 'snapshot'
    tasks: GroupSessionTask[]
  }
  | {
    type: 'task:upserted'
    task: GroupSessionTask
  }
  | {
    type: 'task:deleted'
    taskId: string
    userId: string
  }
  | {
    type: 'ratings:updated'
    taskIds: string[]
  }
  | {
    type: 'pairing:created'
    pairingId: string
  }
  | {
    type: 'pool:reset'
  }

export function parseGroupSessionEvent(data: string): GroupSessionEvent | null {
  try {
    const parsed: unknown = JSON.parse(data)

    if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
      return null
    }

    const event = parsed as GroupSessionEvent
    switch (event.type) {
      case 'snapshot':
        return Array.isArray(event.tasks) ? event : null
      case 'task:upserted':
        return typeof event.task === 'object' && event.task !== null ? event : null
      case 'task:deleted':
        return typeof event.taskId === 'string' && typeof event.userId === 'string' ? event : null
      case 'ratings:updated':
        return Array.isArray(event.taskIds) ? event : null
      case 'pairing:created':
        return typeof event.pairingId === 'string' ? event : null
      case 'pool:reset':
        return event
      default:
        return null
    }
  }
  catch {
    return null
  }
}

export function toTask(task: GroupSessionTask): Task {
  return {
    id: task.id,
    description: task.description,
    userId: task.userId,
    fullName: task.fullName,
    avatarUrl: task.avatarUrl,
    helpCapacity: task.helpCapacity,
    ratingsCompletedCount: task.ratingsCompletedCount,
    ratingsCompletionOrder: task.ratingsCompletionOrder,
  }
}
