import { describe, expect, it } from 'vitest'
import { deleteTaskInputSchema, groupIdInputSchema, upsertHelpCapacitiesInputSchema } from './groupActionInputs'

const groupId = '11111111-1111-4111-8111-111111111111'

describe('group action input schemas', () => {
  it('accepts valid group UUID input', () => {
    expect(groupIdInputSchema.parse({ groupId })).toEqual({ groupId })
  })

  it('rejects invalid group IDs', () => {
    expect(groupIdInputSchema.safeParse({ groupId: 'not-a-group-id' }).success).toBe(false)
  })

  it('requires a non-empty task ID', () => {
    expect(deleteTaskInputSchema.safeParse({ groupId, taskId: 'task-1' }).success).toBe(true)
    expect(deleteTaskInputSchema.safeParse({ groupId, taskId: '   ' }).success).toBe(false)
  })

  it('validates help capacity update bounds', () => {
    expect(upsertHelpCapacitiesInputSchema.safeParse({
      groupId,
      updates: [{ taskId: 'task-1', capacity: 3 }],
    }).success).toBe(true)

    expect(upsertHelpCapacitiesInputSchema.safeParse({
      groupId,
      updates: [{ taskId: 'task-1', capacity: 0 }],
    }).success).toBe(false)

    expect(upsertHelpCapacitiesInputSchema.safeParse({
      groupId,
      updates: [{ taskId: 'task-1', capacity: 6 }],
    }).success).toBe(false)
  })
})
