export interface PairingTaskCandidate {
  id: string
  description: string
  userId: string
  fullName: string | null
}

export interface HelpCapacityCandidate {
  taskId: string
  userId: string
  helpCapacity: number
}

export interface MissingHelpCapacity {
  taskId: string
  taskDescription: string
  userId: string
  userName: string
}

export interface BuiltPair {
  firstUser: string
  secondUser: string
  affinity: number
  taskIds: [string, string]
}

export interface MatchingOutput {
  matching: number[]
  fullyStable: boolean
  stableDebug: string
  stableResult: number[]
  mwmResultFull: number[]
  mwmResultPartial: number[]
  unmatchedParticipantIndexes: number[]
}
