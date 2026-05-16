import type { PrismaClient, RatingProgress, StoredRatingRow, StoredTaskInput, StoredTaskRow } from './types'
import type { GroupSessionTask } from '@/features/groups/lib/groupSessionEvents'

interface ViewerRatingRow extends Record<string, SqlStorageValue> {
  task_id: string
  help_capacity: number
}

interface StoredTaskIdRow extends Record<string, SqlStorageValue> {
  id: string
}

interface CountRow extends Record<string, SqlStorageValue> {
  count: number
}

export function initializeGroupSessionStorage(ctx: DurableObjectState): void {
  ctx.storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS active_tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      description TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)
  ctx.storage.sql.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      help_capacity INTEGER NOT NULL,
      completion_order INTEGER,
      PRIMARY KEY (task_id, user_id)
    )
  `)
}

export function toStoredTask(
  task: StoredTaskRow,
  viewerRatings: Map<string, number>,
  progressByUserId: Map<string, RatingProgress>,
): GroupSessionTask {
  const progress = progressByUserId.get(task.user_id)

  return {
    id: task.id,
    description: task.description,
    userId: task.user_id,
    fullName: task.full_name,
    avatarUrl: task.avatar_url,
    helpCapacity: viewerRatings.get(task.id) ?? null,
    ratingsCompletedCount: progress?.count ?? 0,
    ratingsCompletionOrder: progress?.completionOrder ?? null,
  }
}

export function upsertStoredTask(ctx: DurableObjectState, task: StoredTaskInput): void {
  const replacedTaskIds = ctx.storage.sql.exec<StoredTaskIdRow>(
    'SELECT id FROM active_tasks WHERE user_id = ? AND id != ?',
    task.user_id,
    task.id,
  ).toArray().map(row => row.id)

  for (const replacedTaskId of replacedTaskIds) {
    ctx.storage.sql.exec('DELETE FROM ratings WHERE task_id = ?', replacedTaskId)
  }
  ctx.storage.sql.exec('DELETE FROM active_tasks WHERE user_id = ? AND id != ?', task.user_id, task.id)
  ctx.storage.sql.exec(
    `INSERT INTO active_tasks (id, user_id, description, full_name, avatar_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       user_id = excluded.user_id,
       description = excluded.description,
       full_name = excluded.full_name,
       avatar_url = excluded.avatar_url,
       created_at = excluded.created_at,
       updated_at = excluded.updated_at`,
    task.id,
    task.user_id,
    task.description,
    task.full_name,
    task.avatar_url,
    task.created_at,
    task.updated_at,
  )
}

export function deleteStoredTaskAndRatings(ctx: DurableObjectState, taskId: string, userId: string): void {
  ctx.storage.sql.exec('DELETE FROM ratings WHERE task_id = ? OR user_id = ?', taskId, userId)
  ctx.storage.sql.exec('DELETE FROM active_tasks WHERE id = ?', taskId)
}

export function upsertStoredRatings(
  ctx: DurableObjectState,
  ratings: Array<{ id: bigint | number, task_id: bigint | number, user_id: string, help_capacity: number }>,
): void {
  for (const rating of ratings) {
    ctx.storage.sql.exec(
      `INSERT INTO ratings (task_id, user_id, help_capacity, completion_order)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(task_id, user_id) DO UPDATE SET
         help_capacity = excluded.help_capacity,
         completion_order = excluded.completion_order`,
      String(rating.task_id),
      rating.user_id,
      rating.help_capacity,
      Number(rating.id),
    )
  }
}

export function upsertStoredRatingUpdates(
  ctx: DurableObjectState,
  userId: string,
  updates: Array<{ taskId: string, capacity: number }>,
): RatingProgress {
  const completionOrderBase = Date.now()

  for (const [index, update] of updates.entries()) {
    ctx.storage.sql.exec(
      `INSERT INTO ratings (task_id, user_id, help_capacity, completion_order)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(task_id, user_id) DO UPDATE SET
         help_capacity = excluded.help_capacity`,
      update.taskId,
      userId,
      update.capacity,
      completionOrderBase + index,
    )
  }

  return getRatingProgressForUser(ctx, userId)
}

export function clearStoredGroupSession(ctx: DurableObjectState): void {
  ctx.storage.sql.exec('DELETE FROM ratings')
  ctx.storage.sql.exec('DELETE FROM active_tasks')
}

export function getStoredTasks(ctx: DurableObjectState): StoredTaskRow[] {
  return ctx.storage.sql.exec<StoredTaskRow>(
    `SELECT id, user_id, description, full_name, avatar_url, created_at, updated_at
     FROM active_tasks
     ORDER BY created_at ASC, id ASC`,
  ).toArray()
}

export function hasStoredGroupSessionState(ctx: DurableObjectState): boolean {
  const activeTaskCount = ctx.storage.sql.exec<CountRow>(
    'SELECT COUNT(*) as count FROM active_tasks',
  ).one().count
  const ratingCount = ctx.storage.sql.exec<CountRow>(
    'SELECT COUNT(*) as count FROM ratings',
  ).one().count

  return activeTaskCount > 0 || ratingCount > 0
}

export function getStoredRatings(ctx: DurableObjectState): StoredRatingRow[] {
  return ctx.storage.sql.exec<StoredRatingRow>(
    'SELECT task_id, user_id, help_capacity, completion_order FROM ratings',
  ).toArray()
}

export function getStoredTaskById(ctx: DurableObjectState, taskId: string): StoredTaskRow | null {
  const rows = ctx.storage.sql.exec<StoredTaskRow>(
    `SELECT id, user_id, description, full_name, avatar_url, created_at, updated_at
     FROM active_tasks
     WHERE id = ?`,
    taskId,
  ).toArray()

  return rows[0] ?? null
}

export function getStoredTaskByUserId(ctx: DurableObjectState, userId: string): StoredTaskRow | null {
  const rows = ctx.storage.sql.exec<StoredTaskRow>(
    `SELECT id, user_id, description, full_name, avatar_url, created_at, updated_at
     FROM active_tasks
     WHERE user_id = ?
     ORDER BY created_at ASC, id ASC
     LIMIT 1`,
    userId,
  ).toArray()

  return rows[0] ?? null
}

export function removeStoredTasks(ctx: DurableObjectState, taskIds: string[]): void {
  for (const taskId of taskIds) {
    ctx.storage.sql.exec('DELETE FROM active_tasks WHERE id = ?', taskId)
  }
}

export function pruneRatingsToActiveTasks(ctx: DurableObjectState): void {
  ctx.storage.sql.exec(
    `DELETE FROM ratings
     WHERE task_id NOT IN (SELECT id FROM active_tasks)`,
  )
}

export function getTasksForUser(ctx: DurableObjectState, userId: string): GroupSessionTask[] {
  const viewerRatings = new Map(
    ctx.storage.sql.exec<ViewerRatingRow>(
      'SELECT task_id, help_capacity FROM ratings WHERE user_id = ?',
      userId,
    ).toArray().map(rating => [rating.task_id, rating.help_capacity]),
  )
  const progressByUserId = getRatingProgressByUserId(ctx)

  return getStoredTasks(ctx).map(task => toStoredTask(task, viewerRatings, progressByUserId))
}

export function getRatingProgressByUserId(ctx: DurableObjectState): Map<string, RatingProgress> {
  const progress = new Map<string, RatingProgress>()

  for (const rating of getStoredRatings(ctx)) {
    const current = progress.get(rating.user_id) ?? {
      count: 0,
      completionOrder: null,
    }
    progress.set(rating.user_id, {
      count: current.count + 1,
      completionOrder: current.completionOrder === null
        ? rating.completion_order
        : Math.max(current.completionOrder, rating.completion_order ?? 0),
    })
  }

  return progress
}

export function getRatingProgressForUser(ctx: DurableObjectState, userId: string): RatingProgress {
  return getRatingProgressByUserId(ctx).get(userId) ?? {
    count: 0,
    completionOrder: null,
  }
}

export async function hydrateGroupSessionStorage(
  ctx: DurableObjectState,
  groupId: string,
  prisma: PrismaClient,
): Promise<void> {
  const tasks = await prisma.task.findMany({
    where: {
      group_id: groupId,
      pairing_id: null,
      delete_pending: {
        not: true,
      },
    },
    select: {
      id: true,
      description: true,
      user_id: true,
      created_at: true,
      updated_at: true,
      profile: {
        select: {
          full_name: true,
          avatar_url: true,
        },
      },
    },
  })
  const activeTaskIds = tasks.map(task => task.id)
  const ratings = activeTaskIds.length > 0
    ? await prisma.task_help_capacity.findMany({
        where: {
          task_id: {
            in: activeTaskIds,
          },
        },
        select: {
          id: true,
          task_id: true,
          user_id: true,
          help_capacity: true,
        },
      })
    : []

  clearStoredGroupSession(ctx)

  for (const task of tasks) {
    upsertStoredTask(ctx, {
      id: String(task.id),
      user_id: task.user_id,
      description: task.description,
      full_name: task.profile.full_name,
      avatar_url: task.profile.avatar_url,
      created_at: task.created_at.toISOString(),
      updated_at: task.updated_at.toISOString(),
    })
  }

  upsertStoredRatings(ctx, ratings)
}
