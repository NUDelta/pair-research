import type { HelpCapacityCandidate, PairingTaskCandidate } from './types'
import {
  createHelpCapacityLookup,
  getDirectedAffinity,
  getUndirectedAffinity,
} from './helpCapacities'

/**
 * Produces a deterministic task order so graph indexes stay stable.
 *
 * @param tasks - Pairing candidates for the current round.
 * @returns A copy of the tasks sorted by task id.
 */
export function sortPairingTasks(tasks: PairingTaskCandidate[]): PairingTaskCandidate[] {
  return [...tasks].sort((left, right) => left.id.localeCompare(right.id))
}

/**
 * Builds the directed affinity graph used by the stable-roommates phase.
 *
 * @param tasks - Ordered pairing candidates. Index position becomes the graph node id.
 * @param helpCapacities - Directed help ratings between participants.
 * @returns Square matrix where `graph[i][j]` is how well task `i` believes user `j`
 * can help, and diagonal values are always `0`.
 */
export function buildDirectedAffinityGraph(
  tasks: PairingTaskCandidate[],
  helpCapacities: HelpCapacityCandidate[],
): number[][] {
  const helpCapacityLookup = createHelpCapacityLookup(helpCapacities)

  return tasks.map(sourceTask =>
    tasks.map((targetTask) => {
      if (sourceTask.id === targetTask.id) {
        return 0
      }

      return getDirectedAffinity(helpCapacityLookup, sourceTask.id, targetTask.userId)
    }),
  )
}

/**
 * Builds the undirected mutual-affinity graph used by the weighted fallback.
 *
 * @param tasks - Ordered pairing candidates. Index position becomes the graph node id.
 * @param helpCapacities - Directed help ratings between participants.
 * @returns Square matrix where `graph[i][j]` is the sum of both directed help
 * scores between participants `i` and `j`, and diagonal values are always `0`.
 */
export function buildUndirectedAffinityGraph(
  tasks: PairingTaskCandidate[],
  helpCapacities: HelpCapacityCandidate[],
): number[][] {
  const helpCapacityLookup = createHelpCapacityLookup(helpCapacities)

  return tasks.map((sourceTask, sourceIndex) =>
    tasks.map((targetTask, targetIndex) => {
      if (sourceIndex === targetIndex) {
        return 0
      }

      return getUndirectedAffinity(
        helpCapacityLookup,
        sourceTask.id,
        sourceTask.userId,
        targetTask.id,
        targetTask.userId,
      )
    }),
  )
}
