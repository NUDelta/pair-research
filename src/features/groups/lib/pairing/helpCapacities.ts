import type {
  HelpCapacityCandidate,
  MissingHelpCapacity,
  PairingTaskCandidate,
} from './types'

export type HelpCapacityLookup = Map<string, Map<string, number>>

/**
 * Lists every missing cross-user help-capacity rating in the current pool.
 *
 * @param tasks - Current pairing candidates. Each task contributes one owner who
 * must rate every other participant's task.
 * @param helpCapacities - Persisted directed help scores already submitted.
 * @returns Missing rating entries, one per `(task, user)` gap.
 */
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

/**
 * Builds a nested lookup of `taskId -> helperUserId -> helpCapacity`.
 *
 * @param helpCapacities - Flat directed ratings fetched from storage.
 * @returns Lookup map used by the graph-building helpers.
 */
export function createHelpCapacityLookup(helpCapacities: HelpCapacityCandidate[]): HelpCapacityLookup {
  const helpCapacityLookup = new Map<string, Map<string, number>>()

  for (const capacity of helpCapacities) {
    const taskCapacities = helpCapacityLookup.get(capacity.taskId) ?? new Map<string, number>()

    taskCapacities.set(capacity.userId, capacity.helpCapacity)
    helpCapacityLookup.set(capacity.taskId, taskCapacities)
  }

  return helpCapacityLookup
}

/**
 * Reads the directed affinity score for one task/helper combination.
 *
 * @param helpCapacityLookup - Nested lookup built from the persisted ratings.
 * @param taskId - Task being helped.
 * @param helperUserId - User who could help on the task.
 * @returns The directed help score, or `0` when no score exists.
 */
export function getDirectedAffinity(
  helpCapacityLookup: HelpCapacityLookup,
  taskId: string,
  helperUserId: string,
): number {
  return helpCapacityLookup.get(taskId)?.get(helperUserId) ?? 0
}

/**
 * Computes the mutual affinity between two task owners.
 *
 * @param helpCapacityLookup - Nested lookup built from the persisted ratings.
 * @param firstTaskId - First participant's task id.
 * @param firstUserId - First participant's user id.
 * @param secondTaskId - Second participant's task id.
 * @param secondUserId - Second participant's user id.
 * @returns Sum of both directed help scores for the two participants.
 */
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
