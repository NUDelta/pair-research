/**
 * Task candidate eligible for pairing in the current group round.
 */
export interface PairingTaskCandidate {
  /** Stable task identifier used when persisting pairing results. */
  id: string
  /** Current task text shown to peers during the round. */
  description: string
  /** Owner of the task. This is the participant who may be paired. */
  userId: string
  /** Display name used in warnings and admin confirmation flows. */
  fullName: string | null
}

/**
 * Directed "how much could I help?" score for one user on one task.
 * Missing ratings are treated as `0` by the pairing pipeline.
 */
export interface HelpCapacityCandidate {
  /** Task being rated. */
  taskId: string
  /** User who supplied the rating and could become the helper. */
  userId: string
  /** Numeric help score where larger means more confidence/helpfulness. */
  helpCapacity: number
}

/**
 * Missing cross-user rating discovered before pairing can run confidently.
 */
export interface MissingHelpCapacity {
  /** Task that still needs a rating from another participant. */
  taskId: string
  /** Human-readable task description for the confirmation prompt. */
  taskDescription: string
  /** User who still needs to provide a rating for the task. */
  userId: string
  /** Display name for the missing rater. */
  userName: string
}

/**
 * Final pair returned to the rest of the groups feature.
 */
export interface BuiltPair {
  /** Owner of the first paired task. */
  firstUser: string
  /** Owner of the second paired task. */
  secondUser: string
  /** Sum of both directed help-capacity scores for the pair. */
  affinity: number
  /** The two task ids paired together, in the same order as the users above. */
  taskIds: [string, string]
}

/**
 * Previous-round history used to bias the next pairing round away from repeats.
 */
export interface PairingHistory {
  /** User-id pairs that were matched in the immediately previous round. */
  previousPairs: Array<readonly [string, string]>
  /** User who was left unmatched in the previous round, when that is known. */
  previousUnmatchedUserId: string | null
}

/**
 * Debug-friendly output from the stable-first pairing pipeline.
 */
export interface MatchingOutput {
  /**
   * Index-based partner mapping.
   * `matching[i] = j` means participant `i` is paired with participant `j`.
   * `matching[i] = -1` means participant `i` is left unmatched.
   */
  matching: number[]
  /** Whether the stable-roommates phase alone solved the entire pool. */
  fullyStable: boolean
  /** Human-readable explanation of how the stable-roommates phase ended. */
  stableDebug: string
  /** Raw result returned by the stable-roommates phase before weighted repair. */
  stableResult: number[]
  /** Maximum-weight matching across the full pool, used as a fallback baseline. */
  mwmResultFull: number[]
  /** Maximum-weight matching across only the unmatched stable-roommates participants. */
  mwmResultPartial: number[]
  /** Original participant indexes that remained unmatched after the stable phase. */
  unmatchedParticipantIndexes: number[]
}
