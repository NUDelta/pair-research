export type TaskRatings = Record<string, number | undefined>

export interface HorseRaceEntry {
  completedRatingsCount: number
  fullName: string | null
  hasBadge: boolean
  progressPercent: number
  rank: number
  taskId: string
  totalRatingsToFinish: number
  userAvatar: string | null
  userId: string
}

export function getValidCapacity(value: number | null | undefined): number | undefined {
  if (value !== undefined && value !== null && value >= 1 && value <= 5) {
    return value
  }

  return undefined
}

export function buildRatingsMap(tasks: Task[]): TaskRatings {
  return tasks.reduce((acc, task) => {
    acc[task.id] = getValidCapacity(task.helpCapacity)
    return acc
  }, {} as TaskRatings)
}

/**
 * Summarises how many other pool members the current user has already rated so
 * the detail page can render one compact, consistent progress message.
 */
export function getRatingSummary(tasks: Task[], ratings: TaskRatings) {
  const ratedCount = tasks.filter(task => getValidCapacity(ratings[task.id]) !== undefined).length
  const eligibleOthersCount = tasks.length
  const remainingCount = eligibleOthersCount - ratedCount
  const progressPercent = eligibleOthersCount === 0
    ? 100
    : Math.round((ratedCount / eligibleOthersCount) * 100)

  return {
    ratedCount,
    eligibleOthersCount,
    remainingCount,
    progressPercent,
  }
}

/**
 * Produces a compact progress leaderboard for everyone currently in the pool.
 * The loader provides session completion counts, and the optional `ratings`
 * override lets the current viewer see their own in-flight progress instantly.
 */
export function getHorseRaceEntries(
  tasks: Task[],
  options?: {
    currentUserId?: string
    ratings?: TaskRatings
  },
): HorseRaceEntry[] {
  const totalRatingsToFinish = Math.max(tasks.length - 1, 0)
  const persistedCurrentUserTask = tasks.find(task => task.userId === options?.currentUserId)
  const currentUserCompletedRatings = options?.ratings === undefined
    ? undefined
    : tasks
      .filter(task => task.userId !== options.currentUserId)
      .filter(task => getValidCapacity(options.ratings?.[task.id]) !== undefined)
      .length

  const progressEntries = tasks
    .map((task) => {
      const isCurrentUser = options?.currentUserId !== undefined && task.userId === options.currentUserId
      const completedRatingsCount = isCurrentUser
        ? currentUserCompletedRatings ?? task.ratingsCompletedCount ?? 0
        : task.ratingsCompletedCount ?? 0
      const completionOrder = isCurrentUser
        ? persistedCurrentUserTask?.ratingsCompletionOrder ?? task.ratingsCompletionOrder ?? null
        : task.ratingsCompletionOrder ?? null

      return {
        taskId: task.id,
        userId: task.userId,
        fullName: task.fullName,
        userAvatar: task.avatarUrl,
        completedRatingsCount,
        totalRatingsToFinish,
        progressPercent: totalRatingsToFinish === 0
          ? 100
          : Math.round((completedRatingsCount / totalRatingsToFinish) * 100),
        completionOrder,
        rank: 0,
        hasBadge: false,
      }
    })

  const rankedEntries = [...progressEntries]
    .filter(entry =>
      entry.totalRatingsToFinish > 0
      && entry.completedRatingsCount === entry.totalRatingsToFinish
      && entry.completionOrder !== null,
    )
    .sort((left, right) => {
      const leftCompletionOrder = left.completionOrder ?? Number.MAX_SAFE_INTEGER
      const rightCompletionOrder = right.completionOrder ?? Number.MAX_SAFE_INTEGER

      if (leftCompletionOrder !== rightCompletionOrder) {
        return leftCompletionOrder - rightCompletionOrder
      }

      return (left.fullName ?? '').localeCompare(right.fullName ?? '')
    })
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
      hasBadge: index < 3,
    }))

  const rankByTaskId = new Map(
    rankedEntries.map(entry => [entry.taskId, { rank: entry.rank, hasBadge: entry.hasBadge }]),
  )

  return progressEntries.map((entry) => {
    const rankInfo = rankByTaskId.get(entry.taskId)

    return {
      ...entry,
      rank: rankInfo?.rank ?? 0,
      hasBadge: rankInfo?.hasBadge ?? false,
    }
  })
}
