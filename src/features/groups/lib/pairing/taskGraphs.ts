import type { HelpCapacityCandidate, PairingTaskCandidate } from './types'
import {
  createHelpCapacityLookup,
  getDirectedAffinity,
  getUndirectedAffinity,
} from './helpCapacities'

export function sortPairingTasks(tasks: PairingTaskCandidate[]): PairingTaskCandidate[] {
  return [...tasks].sort((left, right) => left.id.localeCompare(right.id))
}

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
