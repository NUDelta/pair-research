export type TaskRatings = Record<string, number | undefined>

interface RatingSummary {
  ratedCount: number
  eligibleOthersCount: number
  remainingCount: number
  progressPercent: number
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
export function getRatingSummary(tasks: Task[], ratings: TaskRatings): RatingSummary {
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
