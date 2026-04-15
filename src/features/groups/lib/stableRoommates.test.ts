import { describe, expect, it } from 'vitest'
import { createPreferenceMatrix, stableMatchingWrapper } from './pairing/stable-roommates'

describe('createPreferenceMatrix', () => {
  it('sorts each participant by descending affinity and removes self references', () => {
    expect(createPreferenceMatrix([
      [0, 5, 5, 1],
      [2, 0, 3, 4],
      [5, 1, 0, 2],
      [1, 4, 4, 0],
    ])).toEqual([
      [1, 2, 3],
      [3, 2, 0],
      [0, 3, 1],
      [1, 2, 0],
    ])
  })
})

describe('stableMatchingWrapper', () => {
  it('finds a stable matching that requires phase 2 reductions', () => {
    const preferences = [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 0],
      [3, 4, 5, 0, 1],
      [4, 5, 0, 1, 2],
      [5, 0, 1, 2, 3],
      [0, 1, 2, 3, 4],
    ]

    expect(stableMatchingWrapper(preferences)).toEqual({
      matching: [3, 4, 5, 0, 1, 2],
      fullyStable: true,
      debug: 'Stable matching found after Phase 2.',
    })
  })

  it('returns a fully unmatched partial matching when no stable solution exists', () => {
    const preferences = [
      [1, 2, 3],
      [2, 0, 3],
      [0, 1, 3],
      [0, 1, 2],
    ]

    expect(stableMatchingWrapper(preferences)).toEqual({
      matching: [-1, -1, -1, -1],
      fullyStable: false,
      debug: 'Failed at Phase 1: not everyone was proposed to.',
    })
  })

  it('tries every possible odd-person removal and keeps the best stable result', () => {
    const preferences = [
      [1, 2, 3, 4],
      [0, 3, 2, 4],
      [3, 4, 0, 1],
      [2, 4, 1, 0],
      [2, 3, 0, 1],
    ]

    expect(stableMatchingWrapper(preferences)).toEqual({
      matching: [1, 0, 3, 2, -1],
      fullyStable: true,
      debug: 'Stable matching found after Phase 1.',
    })
  })

  it('avoids removing the previously unmatched participant when another odd-pool choice works', () => {
    const preferences = [
      [1, 2],
      [0, 2],
      [0, 1],
    ]

    expect(stableMatchingWrapper(preferences, {
      avoidUnmatchedParticipantIndex: 0,
    })).toEqual({
      matching: [1, 0, -1],
      fullyStable: true,
      debug: 'Stable matching found after Phase 1.',
    })
  })
})
