import type { MatchingOutput } from './types'
import { findMaximumWeightMatching } from './maximumWeightMatching'
import { createPreferenceMatrix, stableMatchingWrapper } from './stable-roommates'

/**
 * Stable roommates decides the ideal structure first. Only the participants
 * still unmatched after that step are handed to weighted matching.
 *
 * @param directedGraph - Directed affinity matrix where `directedGraph[i][j]`
 * means participant `i` thinks participant `j` can help them by that amount.
 * @param undirectedGraph - Mutual affinity matrix where `undirectedGraph[i][j]`
 * is the combined value for pairing participants `i` and `j`.
 * @returns Full algorithm output including the final index-based matching and
 * intermediate stable / weighted results for debugging.
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

/**
 * Rewrites a weighted match computed on the unmatched subset back into the
 * original full-pool participant indexes.
 *
 * @param stableMatching - Stable-roommates output on the full pool.
 * @param weightedMatching - Matching computed on the reduced unmatched subset.
 * @param unmatchedParticipantIndexes - Original participant indexes represented
 * by the reduced weighted graph.
 * @returns Combined full-pool matching using original participant indexes.
 */
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

/**
 * Validates that the matching is symmetric and leaves at most one participant
 * unmatched, which is the only legal unresolved state for an odd-sized pool.
 *
 * @param matching - Index-based partner mapping where `-1` means unmatched.
 * @returns `true` when the matching is internally consistent.
 */
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
