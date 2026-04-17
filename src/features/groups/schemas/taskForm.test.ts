import { describe, expect, it } from 'vitest'
import { taskSchema } from './taskForm'

describe('taskSchema', () => {
  it('rejects descriptions with fewer than 1 words', () => {
    expect(() =>
      taskSchema.parse({
        groupId: '550e8400-e29b-41d4-a716-446655440000',
        description: '',
      }),
    ).toThrow('Task description must be at least 1 words')
  })

  it('accepts descriptions with 1 word', () => {
    const result = taskSchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      description: 'one',
    })

    expect(result.description).toBe('one')
  })

  it('accepts descriptions with up to 50 words', () => {
    const description = Array.from({ length: 50 }, (_, index) => `word${index + 1}`).join(' ')

    const result = taskSchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      description,
    })

    expect(result.description.split(/\s+/)).toHaveLength(50)
  })

  it('rejects descriptions with more than 50 words', () => {
    const description = Array.from({ length: 51 }, (_, index) => `word${index + 1}`).join(' ')

    expect(() =>
      taskSchema.parse({
        groupId: '550e8400-e29b-41d4-a716-446655440000',
        description,
      }),
    ).toThrow('Task description must be at most 50 words')
  })
})
