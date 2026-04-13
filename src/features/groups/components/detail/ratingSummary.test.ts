import { describe, expect, it } from 'vitest'
import { buildRatingsMap, getRatingSummary, getValidCapacity } from './ratingSummary'

describe('ratingSummary', () => {
  it('accepts only 1-5 help capacities', () => {
    expect(getValidCapacity(1)).toBe(1)
    expect(getValidCapacity(5)).toBe(5)
    expect(getValidCapacity(0)).toBeUndefined()
    expect(getValidCapacity(6)).toBeUndefined()
    expect(getValidCapacity(null)).toBeUndefined()
  })

  it('builds a ratings map from tasks', () => {
    expect(buildRatingsMap([
      {
        id: 'task-1',
        description: 'Review intro',
        userId: 'user-2',
        fullName: 'Teammate',
        avatarUrl: null,
        helpCapacity: 3,
      },
      {
        id: 'task-2',
        description: 'Check citations',
        userId: 'user-3',
        fullName: 'Another teammate',
        avatarUrl: null,
        helpCapacity: null,
      },
    ])).toEqual({
      'task-1': 3,
      'task-2': undefined,
    })
  })

  it('summarises rating progress without counting unrated tasks', () => {
    expect(getRatingSummary([
      {
        id: 'task-1',
        description: 'Review intro',
        userId: 'user-2',
        fullName: 'Teammate',
        avatarUrl: null,
        helpCapacity: 2,
      },
      {
        id: 'task-2',
        description: 'Check citations',
        userId: 'user-3',
        fullName: 'Another teammate',
        avatarUrl: null,
        helpCapacity: null,
      },
    ], {
      'task-1': 4,
      'task-2': undefined,
    })).toEqual({
      ratedCount: 1,
      eligibleOthersCount: 2,
      remainingCount: 1,
      progressPercent: 50,
    })
  })
})
