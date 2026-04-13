import { describe, expect, it } from 'vitest'
import { buildPairs, findMissingHelpCapacities } from './pairing'

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
  it('leaves an unmatched task out of the resulting pairs', () => {
    const tasks = [
      { id: '1', description: 'Task 1', userId: 'user-1', fullName: 'User One' },
      { id: '2', description: 'Task 2', userId: 'user-2', fullName: 'User Two' },
      { id: '3', description: 'Task 3', userId: 'user-3', fullName: 'User Three' },
    ]

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
})
