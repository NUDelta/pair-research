import type { StableMatchingCandidate } from './types'

export function formatMatching(holds: number[]): number[] {
  const matching: number[] = Array.from<number>(
    { length: holds.length } as ArrayLike<number>,
  ).fill(-1)

  for (const [proposee, proposer] of holds.entries()) {
    matching[proposee] = proposer
  }

  return matching
}

export function isValidMatching(matching: number[]): boolean {
  const values = new Set(matching)

  if (matching.length % 2 === 0 && values.has(-1)) {
    return false
  }

  for (const [personIndex, partner] of matching.entries()) {
    if (partner !== -1 && matching[partner] !== personIndex) {
      return false
    }
  }

  if (matching.length % 2 === 0) {
    return values.size === matching.length && !values.has(-1)
  }

  return values.size === matching.length
}

export function isStableMatching(matching: number[], ranks: number[][]): boolean {
  for (let firstPerson = 0; firstPerson < matching.length; firstPerson += 1) {
    for (let secondPerson = 0; secondPerson < matching.length; secondPerson += 1) {
      if (firstPerson === secondPerson || matching[firstPerson] === secondPerson) {
        continue
      }

      const firstPartner = matching[firstPerson]
      const secondPartner = matching[secondPerson]

      if (firstPartner === -1 || secondPartner === -1) {
        continue
      }

      if (
        ranks[firstPerson][secondPerson] < ranks[firstPerson][firstPartner]
        && ranks[secondPerson][firstPerson] < ranks[secondPerson][secondPartner]
      ) {
        return false
      }
    }
  }

  return true
}

/**
 * Partial stability keeps only mutual pairs that are also free of blocking pairs.
 * The weighted fallback only runs on the participants filtered out here.
 */
export function computePartiallyStableMatching(
  holdsOrMatching: Array<number | null> | number[],
  ranks: number[][],
): number[] {
  const partialMatching = holdsOrMatching.map(partner => partner ?? -1)

  for (let personIndex = 0; personIndex < partialMatching.length; personIndex += 1) {
    const partner = partialMatching[personIndex]

    if (partner === -1) {
      continue
    }

    if (partialMatching[partner] !== personIndex) {
      partialMatching[personIndex] = -1
      partialMatching[partner] = -1
    }
  }

  for (let firstPerson = 0; firstPerson < partialMatching.length; firstPerson += 1) {
    const firstPartner = partialMatching[firstPerson]

    if (firstPartner === -1) {
      continue
    }

    for (let secondPerson = 0; secondPerson < partialMatching.length; secondPerson += 1) {
      const secondPartner = partialMatching[secondPerson]

      if (secondPartner === -1 || firstPerson === secondPerson || firstPartner === secondPerson) {
        continue
      }

      if (
        ranks[firstPerson][secondPerson] < ranks[firstPerson][firstPartner]
        && ranks[secondPerson][firstPerson] < ranks[secondPerson][secondPartner]
      ) {
        partialMatching[firstPerson] = -1
        partialMatching[firstPartner] = -1
        break
      }
    }
  }

  return partialMatching
}

export function countMatchedParticipants(matching: number[]): number {
  return matching.filter(partner => partner !== -1).length
}

export function compareStableCandidates(
  left: StableMatchingCandidate,
  right: StableMatchingCandidate,
): number {
  if (left.fullyStable !== right.fullyStable) {
    return left.fullyStable ? 1 : -1
  }

  if (left.matchedCount !== right.matchedCount) {
    return left.matchedCount - right.matchedCount
  }

  if (left.preferenceScore !== right.preferenceScore) {
    return left.preferenceScore - right.preferenceScore
  }

  return left.matching.join(',').localeCompare(right.matching.join(','))
}
