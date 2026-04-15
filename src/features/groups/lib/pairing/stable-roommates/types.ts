export interface StableMatchingOptions {
  handleOddMethod?: 'add' | 'remove'
  removeAll?: boolean
}

export interface StableMatchingResult {
  matching: number[]
  fullyStable: boolean
  debug: string
}

export interface OddHandlingResult {
  preferences: number[][]
  removedPerson: number | null
  addedPerson: boolean
}

export interface StableMatchingCandidate extends StableMatchingResult {
  matchedCount: number
  preferenceScore: number
}
