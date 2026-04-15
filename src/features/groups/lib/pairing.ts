export interface PairingTaskCandidate {
  id: string
  description: string
  userId: string
  fullName: string | null
}

export interface HelpCapacityCandidate {
  taskId: string
  userId: string
  helpCapacity: number
}

export interface MissingHelpCapacity {
  taskId: string
  taskDescription: string
  userId: string
  userName: string
}

export interface BuiltPair {
  firstUser: string
  secondUser: string
  affinity: number
  taskIds: [string, string]
}

function getTaskScore(taskId: string, helpCapacities: HelpCapacityCandidate[]) {
  return helpCapacities
    .filter(capacity => capacity.taskId === taskId)
    .reduce((sum, capacity) => sum + capacity.helpCapacity, 0)
}

export function findMissingHelpCapacities(
  tasks: PairingTaskCandidate[],
  helpCapacities: HelpCapacityCandidate[],
): MissingHelpCapacity[] {
  const missingHelpCapacities: MissingHelpCapacity[] = []
  const userIds = tasks.map(task => task.userId)

  for (const task of tasks) {
    for (const userId of userIds) {
      if (userId === task.userId) {
        continue
      }

      const hasHelpCapacity = helpCapacities.some(
        capacity => capacity.taskId === task.id && capacity.userId === userId,
      )

      if (!hasHelpCapacity) {
        const user = tasks.find(candidate => candidate.userId === userId)
        missingHelpCapacities.push({
          taskId: task.id,
          taskDescription: task.description,
          userId,
          userName: user?.fullName ?? 'Unknown User',
        })
      }
    }
  }

  return missingHelpCapacities
}

export function buildPairs(
  tasks: PairingTaskCandidate[],
  helpCapacities: HelpCapacityCandidate[],
): BuiltPair[] {
  const pairs: BuiltPair[] = []
  const usedTaskIds = new Set<string>()
  const pairingCandidates = tasks.length % 2 === 1
    ? [...tasks]
        .sort((left, right) => {
          const scoreDifference = getTaskScore(left.id, helpCapacities) - getTaskScore(right.id, helpCapacities)
          if (scoreDifference !== 0) {
            return scoreDifference
          }

          const nameDifference = (left.fullName ?? '').localeCompare(right.fullName ?? '')
          if (nameDifference !== 0) {
            return nameDifference
          }

          return left.id.localeCompare(right.id)
        })
        .slice(1)
    : tasks

  const sortedTasks = [...pairingCandidates].sort((a, b) => {
    return getTaskScore(b.id, helpCapacities) - getTaskScore(a.id, helpCapacities)
  })

  for (const task1 of sortedTasks) {
    if (usedTaskIds.has(task1.id)) {
      continue
    }

    let bestMatch: { task: PairingTaskCandidate, affinity: number } | null = null

    for (const task2 of sortedTasks) {
      if (task2.id === task1.id || usedTaskIds.has(task2.id)) {
        continue
      }

      const affinity1 = helpCapacities.find(capacity =>
        capacity.taskId === task1.id && capacity.userId === task2.userId,
      )?.helpCapacity ?? 0
      const affinity2 = helpCapacities.find(capacity =>
        capacity.taskId === task2.id && capacity.userId === task1.userId,
      )?.helpCapacity ?? 0
      const totalAffinity = affinity1 + affinity2

      if (bestMatch === null || totalAffinity > bestMatch.affinity) {
        bestMatch = { task: task2, affinity: totalAffinity }
      }
    }

    if (bestMatch !== null) {
      pairs.push({
        firstUser: task1.userId,
        secondUser: bestMatch.task.userId,
        affinity: bestMatch.affinity,
        taskIds: [task1.id, bestMatch.task.id],
      })
      usedTaskIds.add(task1.id)
      usedTaskIds.add(bestMatch.task.id)
    }
  }

  return pairs
}
