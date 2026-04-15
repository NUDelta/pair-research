import type { StableMatchingCandidate, StableMatchingOptions, StableMatchingResult } from './types'
import {
  compareStableCandidates,
  computePartiallyStableMatching,
  countMatchedParticipants,
  formatMatching,
  isStableMatching,
  isValidMatching,
} from './matching'
import { handleOddUsers, undoOddHandling } from './oddPool'
import { findAllOrNothingCycle, phase1, phase1Reduce, phase2Reduce } from './phases'
import { createPreferenceMatrix, createRankMatrix, scoreMatchingByPreferences, validatePreferenceMatrix } from './preferences'

export { createPreferenceMatrix }
export type { StableMatchingResult }

/**
 * Runs Irving's stable roommates algorithm with deterministic odd-pool handling.
 *
 * @param preferences - Preference rows using zero-based participant indexes.
 * `preferences[i][0]` is participant `i`'s first choice.
 * @param options - Odd-pool handling controls. `remove` tries dropping one
 * participant at a time, while `add` introduces a synthetic unmatched participant.
 * @returns Stable or partially-stable index-based partner mapping.
 * `matching[i] = j` means participant `i` is paired with `j`.
 * `matching[i] = -1` means participant `i` is unmatched.
 */
export function stableMatchingWrapper(
  preferences: number[][],
  options: StableMatchingOptions = {},
): StableMatchingResult {
  const { handleOddMethod = 'remove', removeAll = true } = options
  const validatedPreferences = validatePreferenceMatrix(preferences)

  if (validatedPreferences === null) {
    return {
      matching: [],
      fullyStable: false,
      debug: 'Invalid input. Must be an n-by-(n - 1) preference matrix.',
    }
  }

  if (validatedPreferences.length % 2 === 0) {
    return runStableMatching(validatedPreferences, null, false)
  }

  if (handleOddMethod === 'add') {
    const oddHandled = handleOddUsers(validatedPreferences, { method: 'add' })
    return runStableMatching(oddHandled.preferences, oddHandled.removedPerson, oddHandled.addedPerson)
  }

  const removablePeople = removeAll
    ? validatedPreferences.map((_, personIndex) => personIndex)
    : [0]

  let bestResult: StableMatchingCandidate | null = null

  for (const personIndex of removablePeople) {
    const oddHandled = handleOddUsers(validatedPreferences, {
      method: 'remove',
      personToRemove: personIndex,
    })
    const candidate = runStableMatching(
      oddHandled.preferences,
      oddHandled.removedPerson,
      oddHandled.addedPerson,
    )
    const candidateWithScore: StableMatchingCandidate = {
      ...candidate,
      matchedCount: countMatchedParticipants(candidate.matching),
      preferenceScore: scoreMatchingByPreferences(validatedPreferences, candidate.matching),
    }

    if (bestResult === null || compareStableCandidates(candidateWithScore, bestResult) > 0) {
      bestResult = candidateWithScore
    }
  }

  if (bestResult === null) {
    return {
      matching: [],
      fullyStable: false,
      debug: 'Failed to evaluate stable roommates candidates.',
    }
  }

  return {
    matching: bestResult.matching,
    fullyStable: bestResult.fullyStable,
    debug: bestResult.debug,
  }
}

/**
 * Executes the stable-roommates phases for one concrete participant set.
 *
 * @param preferences - Validated preference matrix for the current reduced pool.
 * @param removedPerson - Original participant removed to make an odd pool even, if any.
 * @param addedPerson - Whether the odd pool was handled by adding a synthetic participant.
 * @returns Stable or partially-stable result mapped back to the original pool indexes.
 */
function runStableMatching(
  preferences: number[][],
  removedPerson: number | null,
  addedPerson: boolean,
): StableMatchingResult {
  const ranks = createRankMatrix(preferences)
  const holds = phase1(preferences, ranks)

  if (holds.includes(null)) {
    return {
      matching: undoOddHandling(computePartiallyStableMatching(holds, ranks), removedPerson, addedPerson),
      fullyStable: false,
      debug: 'Failed at Phase 1: not everyone was proposed to.',
    }
  }

  const reducedPreferences = phase1Reduce(preferences, ranks, holds as number[])

  if (reducedPreferences.every(row => row.length === 1)) {
    return finalizeStableResult(formatMatching(holds as number[]), ranks, removedPerson, addedPerson, 'Phase 1')
  }

  const cycle = findAllOrNothingCycle(reducedPreferences)

  if (cycle === null || cycle.length === 3) {
    return {
      matching: undoOddHandling(
        computePartiallyStableMatching(formatMatching(holds as number[]), ranks),
        removedPerson,
        addedPerson,
      ),
      fullyStable: false,
      debug: 'Failed at Phase 2: could not find a usable all-or-nothing cycle.',
    }
  }

  const finalHolds = phase2Reduce(reducedPreferences, ranks, cycle)

  if (finalHolds === null) {
    return {
      matching: undoOddHandling(
        computePartiallyStableMatching(formatMatching(holds as number[]), ranks),
        removedPerson,
        addedPerson,
      ),
      fullyStable: false,
      debug: 'Failed at Phase 2 reduction.',
    }
  }

  return finalizeStableResult(formatMatching(finalHolds), ranks, removedPerson, addedPerson, 'Phase 2')
}

/**
 * Normalizes the result after a stable-roommates phase finishes.
 *
 * @param matching - Candidate index-based partner mapping for the current reduced pool.
 * @param ranks - Rank lookup derived from the reduced preference matrix.
 * @param removedPerson - Original participant removed to make an odd pool even, if any.
 * @param addedPerson - Whether a synthetic participant was injected for odd-pool handling.
 * @param phaseLabel - Which stable-roommates phase produced the candidate result.
 * @returns Final public result, restoring any odd-pool adjustments on the way out.
 */
function finalizeStableResult(
  matching: number[],
  ranks: number[][],
  removedPerson: number | null,
  addedPerson: boolean,
  phaseLabel: 'Phase 1' | 'Phase 2',
): StableMatchingResult {
  if (isValidMatching(matching) && isStableMatching(matching, ranks)) {
    return {
      matching: undoOddHandling(matching, removedPerson, addedPerson),
      fullyStable: true,
      debug: `Stable matching found after ${phaseLabel}.`,
    }
  }

  return {
    matching: undoOddHandling(computePartiallyStableMatching(matching, ranks), removedPerson, addedPerson),
    fullyStable: false,
    debug: `Failed at Verification after ${phaseLabel}.`,
  }
}
