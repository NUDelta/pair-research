import { describe, expect, it } from 'vitest'
import { groupSchema } from '@/features/groups/schemas/groupForm'
import { taskSchema } from '@/features/groups/schemas/taskForm'
import { parseValidatedInput } from './parseValidatedInput'

describe('parseValidatedInput', () => {
  it('throws a human-readable validation message instead of raw zod issues', () => {
    expect(() =>
      parseValidatedInput(taskSchema, {
        groupId: '550e8400-e29b-41d4-a716-446655440000',
        description: '', // Invalid: empty description
      }),
    ).toThrow('Task description must be at least 1 words.')
  })

  it('uses plain-language messaging for invalid group names', () => {
    expect(() =>
      parseValidatedInput(groupSchema, {
        groupName: 'Research@Group',
        groupDescription: 'We workshop drafts together.',
        roles: [{ title: 'Researcher' }],
        assignedRole: 'Researcher',
        members: [],
      }),
    ).toThrow('Use letters, numbers, spaces, hyphens, or underscores for the group name.')
  })

  it('uses plain-language messaging for invalid descriptions', () => {
    expect(() =>
      parseValidatedInput(groupSchema, {
        groupName: 'Research Group',
        groupDescription: 'Please review <draft> notes before Friday.',
        roles: [{ title: 'Researcher' }],
        assignedRole: 'Researcher',
        members: [],
      }),
    ).toThrow('Write a short plain-text description and avoid angle brackets like < or >.')
  })

  it('rejects duplicate role titles after trimming and casing normalization', () => {
    expect(() =>
      parseValidatedInput(groupSchema, {
        groupName: 'Research Group',
        groupDescription: 'We workshop drafts together.',
        roles: [{ title: 'Researcher' }, { title: ' researcher ' }],
        assignedRole: 'Researcher',
        members: [],
      }),
    ).toThrow('Each role title must be unique.')
  })
})
