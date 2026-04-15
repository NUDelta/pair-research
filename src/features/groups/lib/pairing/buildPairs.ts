import type { BuiltPair, HelpCapacityCandidate, PairingTaskCandidate } from './types'
import { createMatchingOutput } from './createMatchingOutput'
import { buildDirectedAffinityGraph, buildUndirectedAffinityGraph, sortPairingTasks } from './taskGraphs'

/**
 * Builds pairs by preserving stable roommate assignments where possible, then
 * repairing unresolved participants with a weighted matching pass.
 *
 * @param tasks - Tasks currently in the pairing pool. Each task represents one participant.
 * @param helpCapacities - Directed help scores that describe who can help whom.
 * @returns Final persisted pair records. Each record contains user ids, task ids,
 * and the combined mutual affinity used for the pairing.
 */
export function buildPairs(
  tasks: PairingTaskCandidate[],
  helpCapacities: HelpCapacityCandidate[],
): BuiltPair[] {
  const orderedTasks = sortPairingTasks(tasks)
  const directedGraph = buildDirectedAffinityGraph(orderedTasks, helpCapacities)
  const undirectedGraph = buildUndirectedAffinityGraph(orderedTasks, helpCapacities)
  const { matching } = createMatchingOutput(directedGraph, undirectedGraph)
  const pairs: BuiltPair[] = []

  for (const [taskIndex, partnerIndex] of matching.entries()) {
    if (partnerIndex === -1 || taskIndex > partnerIndex) {
      continue
    }

    const firstTask = orderedTasks[taskIndex]
    const secondTask = orderedTasks[partnerIndex]

    pairs.push({
      firstUser: firstTask.userId,
      secondUser: secondTask.userId,
      affinity: undirectedGraph[taskIndex][partnerIndex],
      taskIds: [firstTask.id, secondTask.id],
    })
  }

  return pairs
}
