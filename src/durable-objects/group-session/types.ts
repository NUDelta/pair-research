import type { GroupSessionTask } from '@/features/groups/lib/groupSessionEvents'

export type PrismaClient = Awaited<ReturnType<typeof import('@/shared/server/prisma').getPrismaClient>>

export interface GroupSessionRequest {
  groupId: string
  userId: string
}

export interface UpsertTaskRequest extends GroupSessionRequest {
  description: string
}

export interface DeleteTaskRequest extends GroupSessionRequest {
  taskId: string
}

export interface UpsertRatingsRequest extends GroupSessionRequest {
  updates: Array<{
    taskId: string
    capacity: number
  }>
}

export interface MakePairsResponse {
  success: boolean
  message: string
  data?: {
    pairingId?: string
    pairs?: Array<{
      firstUser: string
      secondUser: string
      affinity: number
    }>
  }
}

export interface GroupSessionSnapshot {
  tasks: GroupSessionTask[]
}

export interface StoredTaskRow extends Record<string, SqlStorageValue> {
  id: string
  user_id: string
  description: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface StoredRatingRow extends Record<string, SqlStorageValue> {
  task_id: string
  user_id: string
  help_capacity: number
  completion_order: number | null
}

export interface RatingProgress {
  count: number
  completionOrder: number | null
}

export interface StoredTaskInput {
  id: string
  user_id: string
  description: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export const ACTIVE_PAIRING_EXISTS_MESSAGE = 'This group already has an active pairing. Reset the pool before making new pairs.'
export const POOL_CHANGED_MESSAGE = 'The pool changed before pairs could be created. Please review the current pool and try again.'
