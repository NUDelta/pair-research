interface ActionResponse {
  success: boolean
  message: string
}

interface Task {
  id: string
  description: string
  userId: string
  fullName: string | null
  avatarUrl: string | null
  helpCapacity: number | null
}
