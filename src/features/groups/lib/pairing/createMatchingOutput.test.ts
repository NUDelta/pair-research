import { describe, expect, it } from 'vitest'
import { createMatchingOutput } from './createMatchingOutput'

describe('createMatchingOutput', () => {
  it('returns the stable matching unchanged when the stable pass succeeds', () => {
    expect(createMatchingOutput(
      [
        [0, 8, 7, 1],
        [8, 0, 1, 7],
        [7, 1, 0, 8],
        [1, 7, 8, 0],
      ],
      [
        [0, 16, 14, 2],
        [16, 0, 2, 14],
        [14, 2, 0, 16],
        [2, 14, 16, 0],
      ],
    )).toEqual({
      matching: [1, 0, 3, 2],
      fullyStable: true,
      stableDebug: 'Stable matching found after Phase 1.',
      stableResult: [1, 0, 3, 2],
      mwmResultFull: [1, 0, 3, 2],
      mwmResultPartial: [],
      unmatchedParticipantIndexes: [],
    })
  })

  it('repairs unmatched participants with weighted matching when the stable pass is partial', () => {
    expect(createMatchingOutput(
      [
        [0, 3, 2, 1],
        [2, 0, 3, 1],
        [3, 2, 0, 1],
        [3, 2, 1, 0],
      ],
      [
        [0, 5, 5, 4],
        [5, 0, 5, 3],
        [5, 5, 0, 2],
        [4, 3, 2, 0],
      ],
    )).toEqual({
      matching: [3, 2, 1, 0],
      fullyStable: false,
      stableDebug: 'Failed at Phase 1: not everyone was proposed to.',
      stableResult: [-1, -1, -1, -1],
      mwmResultFull: [3, 2, 1, 0],
      mwmResultPartial: [3, 2, 1, 0],
      unmatchedParticipantIndexes: [0, 1, 2, 3],
    })
  })
})
