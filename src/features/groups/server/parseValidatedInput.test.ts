import { describe, expect, it } from 'vitest'
import { taskSchema } from '@/features/groups/schemas/taskForm'
import { parseValidatedInput } from './parseValidatedInput'

describe('parseValidatedInput', () => {
  it('throws a human-readable validation message instead of raw zod issues', () => {
    expect(() =>
      parseValidatedInput(taskSchema, {
        groupId: '550e8400-e29b-41d4-a716-446655440000',
        description: 'hey',
      }),
    ).toThrowError('Task description must be at least 5 characters.')
  })
})
