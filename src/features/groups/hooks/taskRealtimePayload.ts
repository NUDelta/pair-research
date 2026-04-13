import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export type TaskRealtimePayload = RealtimePostgresChangesPayload<Record<string, unknown>>

interface TaskRealtimeIdentity {
  taskId: string | null
  userId: string | null
  previousPairingId: string | null
}

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== 'object' || value === null) {
    return null
  }

  return value as Record<string, unknown>
}

const toStringOrNull = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null
  }

  return String(value)
}

const toBooleanOrNull = (value: unknown): boolean | null => {
  if (value === undefined || value === null) {
    return null
  }

  return Boolean(value)
}

/**
 * Extracts the task/user identifiers needed to reconcile realtime updates before
 * the full task row can be trusted.
 */
export function getTaskRealtimeIdentity(payload: TaskRealtimePayload): TaskRealtimeIdentity {
  const nextRow = asRecord(payload.new)
  const previousRow = asRecord(payload.old)

  return {
    taskId: toStringOrNull(nextRow?.id ?? previousRow?.id),
    userId: toStringOrNull(nextRow?.user_id ?? previousRow?.user_id),
    previousPairingId: toStringOrNull(previousRow?.pairing_id),
  }
}

/**
 * Builds a `TaskRow` from an insert/update payload when the required task fields
 * are present. Returns `null` for partial payloads so callers can ignore them.
 */
export function parseTaskRealtimeRow(data: unknown): TaskRow | null {
  const row = asRecord(data)

  if (
    row === null
    || !('id' in row)
    || !('description' in row)
    || !('user_id' in row)
    || !('group_id' in row)
    || !('created_at' in row)
    || !('pairing_id' in row)
  ) {
    return null
  }

  return {
    id: String(row.id),
    description: String(row.description),
    user_id: String(row.user_id),
    group_id: String(row.group_id),
    created_at: String(row.created_at),
    pairing_id: toStringOrNull(row.pairing_id),
    delete_pending: toBooleanOrNull(row.delete_pending),
  }
}

export function isTaskProfileRecord(
  value: unknown,
): value is { id: string, full_name: string | null, avatar_url: string | null } {
  return (
    typeof value === 'object'
    && value !== null
    && 'id' in value
    && 'full_name' in value
    && 'avatar_url' in value
  )
}
