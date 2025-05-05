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
}
