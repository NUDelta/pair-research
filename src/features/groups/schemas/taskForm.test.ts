import { describe, expect, it } from 'vitest'
import { taskSchema } from './taskForm'

describe('taskSchema', () => {
  it('rejects descriptions with fewer than 5 words', () => {
    expect(() =>
      taskSchema.parse({
        groupId: '550e8400-e29b-41d4-a716-446655440000',
        description: 'one two three four',
      }),
    ).toThrowError('Task description must be at least 5 words')
  })

  it('accepts descriptions with 5 words', () => {
    const result = taskSchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      description: 'one two three four five',
    })

    expect(result.description).toBe('one two three four five')
  })

  it('accepts descriptions with up to 150 words', () => {
    const description = Array.from({ length: 150 }, (_, index) => `word${index + 1}`).join(' ')

    const result = taskSchema.parse({
      groupId: '550e8400-e29b-41d4-a716-446655440000',
      description,
    })

    expect(result.description.split(/\s+/)).toHaveLength(150)
  })

  it('rejects descriptions with more than 150 words', () => {
    const description = Array.from({ length: 151 }, (_, index) => `word${index + 1}`).join(' ')

    expect(() =>
      taskSchema.parse({
        groupId: '550e8400-e29b-41d4-a716-446655440000',
        description,
      }),
    ).toThrowError('Task description must be at most 150 words')
  })
})
