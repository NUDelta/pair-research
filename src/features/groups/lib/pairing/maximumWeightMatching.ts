interface WeightedMatchingResult {
  /**
   * Index-based partner mapping.
   * `matching[i] = j` means participant `i` is paired with participant `j`.
   * `matching[i] = -1` means participant `i` is left unmatched.
   */
  matching: number[]
  /** Number of realized pairs in the matching. */
  pairCount: number
  /** Sum of all chosen edge weights. */
  totalWeight: number
}

interface MemoizedMatchingResult {
  pairCount: number
  totalWeight: number
  choice: { type: 'skip' } | { type: 'pair', partner: number } | null
}

/**
 * Computes an exact maximum-weight matching for the current pool.
 *
 * The solver prefers maximum cardinality first, then maximum total weight.
 * That matches the behavior expected by the pairing flow: leave someone
 * unmatched only when the participant count is odd.
 *
 * @param weightMatrix - Symmetric affinity matrix where `weightMatrix[i][j]`
 * is the benefit of pairing participants `i` and `j`.
 * @returns Exact best matching for the matrix, including pair count and total weight.
 */
export function findMaximumWeightMatching(weightMatrix: number[][]): WeightedMatchingResult {
  const participantCount = weightMatrix.length

  if (participantCount === 0) {
    return {
      matching: [],
      pairCount: 0,
      totalWeight: 0,
    }
  }

  const fullMask = (1n << BigInt(participantCount)) - 1n
  const memo = new Map<bigint, MemoizedMatchingResult>()

  const solve = (mask: bigint): MemoizedMatchingResult => {
    if (mask === 0n) {
      return {
        pairCount: 0,
        totalWeight: 0,
        choice: null,
      }
    }

    const cached = memo.get(mask)

    if (cached !== undefined) {
      return cached
    }

    const firstParticipant = findFirstParticipant(mask, participantCount)
    const remainingMask = mask & ~(1n << BigInt(firstParticipant))
    let best: MemoizedMatchingResult = {
      ...solve(remainingMask),
      choice: { type: 'skip' },
    }

    for (let partner = firstParticipant + 1; partner < participantCount; partner += 1) {
      const partnerBit = 1n << BigInt(partner)

      if ((remainingMask & partnerBit) === 0n) {
        continue
      }

      const pairedMask = remainingMask & ~partnerBit
      const candidate = solve(pairedMask)
      const pairedResult: MemoizedMatchingResult = {
        pairCount: candidate.pairCount + 1,
        totalWeight: candidate.totalWeight + (weightMatrix[firstParticipant][partner] ?? 0),
        choice: { type: 'pair', partner },
      }

      if (compareWeightedResults(pairedResult, best) > 0) {
        best = pairedResult
      }
    }

    memo.set(mask, best)
    return best
  }

  solve(fullMask)

  const matching: number[] = Array.from<number>(
    { length: participantCount } as ArrayLike<number>,
  ).fill(-1)
  let currentMask = fullMask

  while (currentMask !== 0n) {
    const current = memo.get(currentMask)

    if (current === undefined || current.choice === null) {
      break
    }

    const firstParticipant = findFirstParticipant(currentMask, participantCount)
    const firstBit = 1n << BigInt(firstParticipant)

    if (current.choice.type === 'skip') {
      currentMask &= ~firstBit
      continue
    }

    const partner = current.choice.partner
    const partnerBit = 1n << BigInt(partner)

    matching[firstParticipant] = partner
    matching[partner] = firstParticipant
    currentMask &= ~firstBit
    currentMask &= ~partnerBit
  }

  const result = memo.get(fullMask)

  return {
    matching,
    pairCount: result?.pairCount ?? 0,
    totalWeight: result?.totalWeight ?? 0,
  }
}

/**
 * Chooses between two candidate weighted matchings.
 *
 * @param left - Candidate result being considered.
 * @param right - Current best candidate.
 * @returns Positive when `left` is better, negative when `right` is better, and `0` on a tie.
 */
function compareWeightedResults(
  left: Pick<MemoizedMatchingResult, 'pairCount' | 'totalWeight'>,
  right: Pick<MemoizedMatchingResult, 'pairCount' | 'totalWeight'>,
): number {
  if (left.pairCount !== right.pairCount) {
    return left.pairCount - right.pairCount
  }

  if (left.totalWeight !== right.totalWeight) {
    return left.totalWeight - right.totalWeight
  }

  return 0
}

/**
 * Finds the lowest-numbered participant still present in the bitmask.
 *
 * @param mask - Bitmask of unresolved participants.
 * @param participantCount - Size of the graph represented by the mask.
 * @returns Index of the first still-active participant, or `-1` if the mask is empty.
 */
function findFirstParticipant(mask: bigint, participantCount: number): number {
  for (let participant = 0; participant < participantCount; participant += 1) {
    if ((mask & (1n << BigInt(participant))) !== 0n) {
      return participant
    }
  }

  return -1
}
