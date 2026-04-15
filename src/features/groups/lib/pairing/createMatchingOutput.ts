import type { MatchingOutput } from './types'
import { findMaximumWeightMatching } from './maximumWeightMatching'
import { createPreferenceMatrix, stableMatchingWrapper } from './stable-roommates'

/**
 * Stable roommates decides the ideal structure first. Only the participants
 * still unmatched after that step are handed to weighted matching.
 */
export function createMatchingOutput(
  directedGraph: number[][],
  undirectedGraph: number[][],
): MatchingOutput {
  const stableResult = stableMatchingWrapper(createPreferenceMatrix(directedGraph), {
    handleOddMethod: 'remove',
    removeAll: true,
  })
  const mwmResultFull = findMaximumWeightMatching(undirectedGraph).matching

  if (stableResult.fullyStable) {
    return {
      matching: stableResult.matching,
      fullyStable: true,
      stableDebug: stableResult.debug,
      stableResult: stableResult.matching,
      mwmResultFull,
      mwmResultPartial: [],
      unmatchedParticipantIndexes: [],
    }
  }

  const unmatchedParticipantIndexes = stableResult.matching.flatMap((partner, index) =>
    partner === -1 ? [index] : [],
  )

  if (unmatchedParticipantIndexes.length <= 1) {
    return {
      matching: stableResult.matching,
      fullyStable: false,
      stableDebug: stableResult.debug,
      stableResult: stableResult.matching,
      mwmResultFull,
      mwmResultPartial: [],
      unmatchedParticipantIndexes,
    }
  }

  const reducedUndirectedGraph = unmatchedParticipantIndexes.map(sourceIndex =>
    unmatchedParticipantIndexes.map(targetIndex => undirectedGraph[sourceIndex][targetIndex] ?? 0),
  )
  const mwmResultPartial = findMaximumWeightMatching(reducedUndirectedGraph).matching
  const combinedMatching = combineMatchings(
    stableResult.matching,
    mwmResultPartial,
    unmatchedParticipantIndexes,
  )

  return {
    matching: isResolvedMatching(combinedMatching) ? combinedMatching : mwmResultFull,
    fullyStable: false,
    stableDebug: stableResult.debug,
    stableResult: stableResult.matching,
    mwmResultFull,
    mwmResultPartial,
    unmatchedParticipantIndexes,
  }
}

function combineMatchings(
  stableMatching: number[],
  weightedMatching: number[],
  unmatchedParticipantIndexes: number[],
): number[] {
  const combinedMatching = [...stableMatching]

  for (const [reducedIndex, originalIndex] of unmatchedParticipantIndexes.entries()) {
    const partner = weightedMatching[reducedIndex]

    combinedMatching[originalIndex] = partner === -1
      ? -1
      : unmatchedParticipantIndexes[partner]
  }

  return combinedMatching
}

function isResolvedMatching(matching: number[]): boolean {
  for (const [participant, partner] of matching.entries()) {
    if (partner === -1) {
      continue
    }

    if (matching[partner] !== participant) {
      return false
    }
  }

  return matching.filter(partner => partner === -1).length <= 1
}
