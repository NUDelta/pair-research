import type {
  HelpCapacityCandidate,
  MissingHelpCapacity,
  PairingTaskCandidate,
} from './types'

export type HelpCapacityLookup = Map<string, Map<string, number>>

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

export function createHelpCapacityLookup(helpCapacities: HelpCapacityCandidate[]): HelpCapacityLookup {
  const helpCapacityLookup = new Map<string, Map<string, number>>()

  for (const capacity of helpCapacities) {
    const taskCapacities = helpCapacityLookup.get(capacity.taskId) ?? new Map<string, number>()

    taskCapacities.set(capacity.userId, capacity.helpCapacity)
    helpCapacityLookup.set(capacity.taskId, taskCapacities)
  }

  return helpCapacityLookup
}

export function getDirectedAffinity(
  helpCapacityLookup: HelpCapacityLookup,
  taskId: string,
  helperUserId: string,
): number {
  return helpCapacityLookup.get(taskId)?.get(helperUserId) ?? 0
}

export function getUndirectedAffinity(
  helpCapacityLookup: HelpCapacityLookup,
  firstTaskId: string,
  firstUserId: string,
  secondTaskId: string,
  secondUserId: string,
): number {
  return (
    getDirectedAffinity(helpCapacityLookup, firstTaskId, secondUserId)
    + getDirectedAffinity(helpCapacityLookup, secondTaskId, firstUserId)
  )
}
