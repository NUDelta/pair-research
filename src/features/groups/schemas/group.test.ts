import { describe, expect, it } from 'vitest'
import { groupsResponseSchema } from './group'

describe('groupsResponseSchema', () => {
  it('accepts admin group payloads with nullable descriptions and profile fields', () => {
    const result = groupsResponseSchema.parse([
      {
        id: 'group-1',
        groupName: 'Research Group',
        groupDescription: null,
        role: 'Professor',
        isAdmin: true,
        isPending: false,
        joinedAt: '2026-04-12T12:00:00.000Z',
        createdAt: '2026-04-11T12:00:00.000Z',
        groupMembers: [
          {
            id: 'user-1',
            fullName: null,
            avatarUrl: null,
            email: 'invitee@example.com',
            role: 'PhD Student',
            isAdmin: false,
            isPending: true,
            joinedAt: '2026-04-12T12:00:00.000Z',
          },
        ],
      },
    ])

    expect(result[0]).toMatchObject({
      groupDescription: null,
      groupMembers: [
        {
          fullName: null,
          avatarUrl: null,
        },
      ],
    })
  })
})
