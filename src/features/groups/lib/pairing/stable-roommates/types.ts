/**
 * Options that control how the stable-roommates solver handles odd participant counts.
 */
export interface StableMatchingOptions {
  /** Strategy for odd pools: remove one participant or add a synthetic placeholder. */
  handleOddMethod?: 'add' | 'remove'
  /** When removing for an odd pool, try every possible removal instead of only the first. */
  removeAll?: boolean
  /** Original participant index that should not be chosen as the unmatched user when avoidable. */
  avoidUnmatchedParticipantIndex?: number | null
}

/**
 * Public result returned by the stable-roommates solver.
 */
export interface StableMatchingResult {
  /**
   * Index-based partner mapping.
   * `matching[i] = j` means participant `i` is paired with participant `j`.
   * `matching[i] = -1` means participant `i` is unmatched.
   */
  matching: number[]
  /** Whether the full pool was matched stably without needing weighted repair. */
  fullyStable: boolean
  /** Human-readable explanation of how the solver terminated. */
  debug: string
}

export interface OddHandlingResult {
  /** Preference matrix after the odd-pool adjustment has been applied. */
  preferences: number[][]
  /** Original participant index removed for odd-pool handling, if any. */
  removedPerson: number | null
  /** Whether a synthetic participant was added instead of removing someone. */
  addedPerson: boolean
}

export interface StableMatchingCandidate extends StableMatchingResult {
  /** Count of non-`-1` participant assignments used when comparing candidates. */
  matchedCount: number
  /** Aggregate preference score used to break ties between candidate results. */
  preferenceScore: number
}
