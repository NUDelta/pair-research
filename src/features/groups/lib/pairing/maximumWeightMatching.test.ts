import { describe, expect, it } from 'vitest'
import { findMaximumWeightMatching } from './maximumWeightMatching'

describe('findMaximumWeightMatching', () => {
  it('prefers maximum cardinality over a heavier single edge', () => {
    expect(findMaximumWeightMatching([
      [0, 50, 3, 3],
      [50, 0, 3, 3],
      [3, 3, 0, 3],
      [3, 3, 3, 0],
    ])).toEqual({
      matching: [1, 0, 3, 2],
      pairCount: 2,
      totalWeight: 53,
    })
  })

  it('keeps one participant unmatched in an odd pool while maximizing the remaining weight', () => {
    expect(findMaximumWeightMatching([
      [0, 9, 1],
      [9, 0, 8],
      [1, 8, 0],
    ])).toEqual({
      matching: [1, 0, -1],
      pairCount: 1,
      totalWeight: 9,
    })
  })
})
