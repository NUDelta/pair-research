import { describe, expect, it } from 'vitest'
import { buildPairs, findMissingHelpCapacities } from './pairing'

function buildTasks(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: String(index + 1),
    description: `Task ${index + 1}`,
    userId: `user-${index + 1}`,
    fullName: `User ${index + 1}`,
  }))
}

function buildHelpCapacitiesFromDirectedMatrix(matrix: number[][]) {
  return matrix.flatMap((row, taskIndex) =>
    row.flatMap((helpCapacity, candidateIndex) => {
      if (taskIndex === candidateIndex) {
        return []
      }

      return [{
        taskId: String(taskIndex + 1),
        userId: `user-${candidateIndex + 1}`,
        helpCapacity,
      }]
    }),
  )
}

describe('findMissingHelpCapacities', () => {
  it('reports every missing cross-user capacity once per missing rating', () => {
    const tasks = [
      { id: '1', description: 'Task 1', userId: 'user-1', fullName: 'User One' },
      { id: '2', description: 'Task 2', userId: 'user-2', fullName: 'User Two' },
    ]

    const result = findMissingHelpCapacities(tasks, [
      { taskId: '1', userId: 'user-2', helpCapacity: 4 },
    ])

    expect(result).toEqual([
      {
        taskId: '2',
        taskDescription: 'Task 2',
        userId: 'user-1',
        userName: 'User One',
      },
    ])
  })
})

describe('buildPairs', () => {
  it('treats missing help-capacity ratings as zero when pairing tasks', () => {
    const tasks = buildTasks(2)

    expect(buildPairs(tasks, [
      { taskId: '1', userId: 'user-2', helpCapacity: 4 },
    ])).toEqual([
      {
        firstUser: 'user-1',
        secondUser: 'user-2',
        affinity: 4,
        taskIds: ['1', '2'],
      },
    ])
  })

  it('leaves the lowest-scoring task out of the resulting pairs when the pool size is odd', () => {
    const tasks = buildTasks(3)

    const result = buildPairs(tasks, [
      { taskId: '1', userId: 'user-2', helpCapacity: 5 },
      { taskId: '2', userId: 'user-1', helpCapacity: 4 },
      { taskId: '1', userId: 'user-3', helpCapacity: 1 },
      { taskId: '3', userId: 'user-1', helpCapacity: 1 },
      { taskId: '2', userId: 'user-3', helpCapacity: 1 },
      { taskId: '3', userId: 'user-2', helpCapacity: 1 },
    ])

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      firstUser: 'user-1',
      secondUser: 'user-2',
      affinity: 9,
      taskIds: ['1', '2'],
    })
  })

  it('falls back to a weighted matching when no stable matching exists', () => {
    const tasks = buildTasks(4)
    const helpCapacities = buildHelpCapacitiesFromDirectedMatrix([
      [0, 3, 2, 1],
      [2, 0, 3, 1],
      [3, 2, 0, 1],
      [3, 2, 1, 0],
    ])

    expect(buildPairs(tasks, helpCapacities)).toEqual([
      {
        firstUser: 'user-1',
        secondUser: 'user-4',
        affinity: 4,
        taskIds: ['1', '4'],
      },
      {
        firstUser: 'user-2',
        secondUser: 'user-3',
        affinity: 5,
        taskIds: ['2', '3'],
      },
    ])
  })

  it('forbids repeated pairs from the previous round when an alternative exists', () => {
    const tasks = buildTasks(4)
    const helpCapacities = buildHelpCapacitiesFromDirectedMatrix([
      [0, 9, 8, 1],
      [9, 0, 1, 8],
      [8, 1, 0, 9],
      [1, 8, 9, 0],
    ])

    expect(buildPairs(tasks, helpCapacities, {
      previousPairs: [['user-1', 'user-2'], ['user-3', 'user-4']],
      previousUnmatchedUserId: null,
    })).toEqual([
      {
        firstUser: 'user-1',
        secondUser: 'user-3',
        affinity: 16,
        taskIds: ['1', '3'],
      },
      {
        firstUser: 'user-2',
        secondUser: 'user-4',
        affinity: 16,
        taskIds: ['2', '4'],
      },
    ])
  })

  it('relaxes to allow a repeated pair when no alternative matching exists', () => {
    const tasks = buildTasks(2)
    const helpCapacities = buildHelpCapacitiesFromDirectedMatrix([
      [0, 9],
      [9, 0],
    ])

    expect(buildPairs(tasks, helpCapacities, {
      previousPairs: [['user-1', 'user-2']],
      previousUnmatchedUserId: null,
    })).toEqual([
      {
        firstUser: 'user-1',
        secondUser: 'user-2',
        affinity: 18,
        taskIds: ['1', '2'],
      },
    ])
  })

  it('avoids leaving the previously unmatched user unmatched again when the pool is odd', () => {
    const tasks = buildTasks(3)
    const helpCapacities = buildHelpCapacitiesFromDirectedMatrix([
      [0, 9, 8],
      [9, 0, 1],
      [8, 1, 0],
    ])

    expect(buildPairs(tasks, helpCapacities, {
      previousPairs: [],
      previousUnmatchedUserId: 'user-1',
    })).toEqual([
      {
        firstUser: 'user-1',
        secondUser: 'user-2',
        affinity: 18,
        taskIds: ['1', '2'],
      },
    ])
  })
})
