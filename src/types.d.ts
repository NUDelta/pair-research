interface ActionResponse {
  success: boolean
  message: string
}

interface TaskRow {
  id: string
  description: string
  user_id: string
  group_id: string
  created_at: string
  pairing_id: string | null
  delete_pending: boolean | null
}

interface Task {
  id: string
  description: string
  userId: string
  fullName: string | null
  avatarUrl: string | null
  helpCapacity: number | null
  ratingsCompletedCount?: number
  ratingsCompletionOrder?: number | null
}

interface CurrentUserActivePair {
  id: string // This is the actual pairing id
  helpeeTaskId: string | null // The id of the helpee task
  helpeeTaskDescription: string | null // The description of the helpee task
  helpeeId: string // The id of the helpee
  helpeeFullName: string | null // The full name of the helpee
  helpeeAvatarUrl: string | null // The avatar url of the helpee
  helperTaskId: string | null // The id of the helper task
  helperTaskDescription: string | null // The description of the helper task
  helperId: string // The id of the helper
  helperFullName: string | null // The full name of the helper
  helperAvatarUrl: string | null // The avatar url of the helper
}
