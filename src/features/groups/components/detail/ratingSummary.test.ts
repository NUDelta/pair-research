import { describe, expect, it } from 'vitest'
import { buildRatingsMap, getHorseRaceEntries, getRatingSummary, getValidCapacity } from './ratingSummary'

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
    const summary = getRatingSummary([
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
    })

    expect(summary).toEqual({
      ratedCount: 1,
      eligibleOthersCount: 2,
      remainingCount: 1,
      progressPercent: 50,
    })
  })

  it('builds horse-race entries from aggregate ratings and optimistic local changes', () => {
    const entries = getHorseRaceEntries([
      {
        id: 'task-1',
        description: 'Review intro',
        userId: 'user-2',
        fullName: 'Teammate',
        avatarUrl: null,
        helpCapacity: 2,
        ratingsCompletedCount: 1,
        ratingsCompletionOrder: 11,
      },
      {
        id: 'task-2',
        description: 'Check citations',
        userId: 'user-3',
        fullName: 'Another teammate',
        avatarUrl: null,
        helpCapacity: null,
        ratingsCompletedCount: 0,
        ratingsCompletionOrder: null,
      },
      {
        id: 'task-3',
        description: 'Annotate sources',
        userId: 'user-1',
        fullName: 'You',
        avatarUrl: null,
        helpCapacity: null,
        ratingsCompletedCount: 0,
        ratingsCompletionOrder: null,
      },
    ], {
      currentUserId: 'user-1',
      ratings: {
        'task-1': 5,
        'task-2': 4,
      },
    })

    expect(entries[0]).toMatchObject({
      taskId: 'task-1',
      completedRatingsCount: 1,
      totalRatingsToFinish: 2,
      progressPercent: 50,
      rank: 0,
      hasBadge: false,
    })
    expect(entries[2]).toMatchObject({
      taskId: 'task-3',
      completedRatingsCount: 2,
      totalRatingsToFinish: 2,
      progressPercent: 100,
      rank: 0,
      hasBadge: false,
    })
  })

  it('ranks full completers by earliest completion order without moving lane order', () => {
    const entries = getHorseRaceEntries([
      {
        id: 'task-1',
        description: 'Review intro',
        userId: 'user-a',
        fullName: 'Alpha',
        avatarUrl: null,
        helpCapacity: null,
        ratingsCompletedCount: 2,
        ratingsCompletionOrder: 10,
      },
      {
        id: 'task-2',
        description: 'Check citations',
        userId: 'user-b',
        fullName: 'Beta',
        avatarUrl: null,
        helpCapacity: null,
        ratingsCompletedCount: 2,
        ratingsCompletionOrder: 15,
      },
      {
        id: 'task-3',
        description: 'Draft summary',
        userId: 'user-c',
        fullName: 'Gamma',
        avatarUrl: null,
        helpCapacity: null,
        ratingsCompletedCount: 1,
        ratingsCompletionOrder: 12,
      },
    ])

    expect(entries[0]).toMatchObject({
      taskId: 'task-1',
      rank: 1,
      hasBadge: true,
    })
    expect(entries[1]).toMatchObject({
      taskId: 'task-2',
      rank: 2,
      hasBadge: true,
    })
    expect(entries[2]).toMatchObject({
      taskId: 'task-3',
      rank: 0,
      hasBadge: false,
    })
  })
})
