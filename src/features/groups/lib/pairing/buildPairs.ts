import type { BuiltPair, HelpCapacityCandidate, PairingHistory, PairingTaskCandidate } from './types'
import { createMatchingOutput } from './createMatchingOutput'
import { buildDirectedAffinityGraph, buildUndirectedAffinityGraph, sortPairingTasks } from './taskGraphs'

/**
 * Builds pairs by preserving stable roommate assignments where possible, then
 * repairing unresolved participants with a weighted matching pass.
 *
 * @param tasks - Tasks currently in the pairing pool. Each task represents one participant.
 * @param helpCapacities - Directed help scores that describe who can help whom.
 * @param history - Previous-round history used to avoid repeats before relaxing.
 * @returns Final persisted pair records. Each record contains user ids, task ids,
 * and the combined mutual affinity used for the pairing.
 */
export function buildPairs(
  tasks: PairingTaskCandidate[],
  helpCapacities: HelpCapacityCandidate[],
  history?: PairingHistory,
): BuiltPair[] {
  const orderedTasks = sortPairingTasks(tasks)
  const attemptHistories: Array<PairingHistory | undefined> = [
    history,
    history ? { previousPairs: [], previousUnmatchedUserId: history.previousUnmatchedUserId } : undefined,
    history ? { previousPairs: [], previousUnmatchedUserId: null } : undefined,
  ]

  for (const attemptHistory of attemptHistories) {
    const directedGraph = buildDirectedAffinityGraph(orderedTasks, helpCapacities, attemptHistory)
    const undirectedGraph = buildUndirectedAffinityGraph(orderedTasks, helpCapacities, attemptHistory)
    const avoidUnmatchedParticipantIndex = attemptHistory?.previousUnmatchedUserId == null
      ? -1
      : orderedTasks.findIndex(task => task.userId === attemptHistory.previousUnmatchedUserId)
    const { matching } = createMatchingOutput(directedGraph, undirectedGraph, {
      avoidUnmatchedParticipantIndex: avoidUnmatchedParticipantIndex >= 0 ? avoidUnmatchedParticipantIndex : null,
    })
    const pairs = buildPairsFromMatching(orderedTasks, undirectedGraph, matching)

    if (pairs.length === Math.floor(orderedTasks.length / 2)) {
      return pairs
    }
  }

  return []
}

function buildPairsFromMatching(
  orderedTasks: PairingTaskCandidate[],
  undirectedGraph: Array<Array<number | null>>,
  matching: number[],
): BuiltPair[] {
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
      affinity: undirectedGraph[taskIndex][partnerIndex] ?? 0,
      taskIds: [firstTask.id, secondTask.id],
    })
  }

  return pairs
}
