import { describe, expect, it } from 'vitest'
import { buildGroupRoleTableRows } from './roleTableRows'

const roles = [
  { id: '1', title: 'Researcher' },
  { id: '2', title: 'Writer' },
]

const members = [
  {
    userId: 'a',
    fullName: 'A',
    avatarUrl: null,
    email: 'a@example.com',
    roleId: '1',
    roleTitle: 'Researcher',
    isAdmin: false,
    isPending: false,
    joinedAt: '2026-01-01T00:00:00.000Z',
    isCreator: false,
  },
  {
    userId: 'b',
    fullName: 'B',
    avatarUrl: null,
    email: 'b@example.com',
    roleId: '1',
    roleTitle: 'Researcher',
    isAdmin: false,
    isPending: true,
    joinedAt: '2026-01-02T00:00:00.000Z',
    isCreator: false,
  },
]

describe('buildGroupRoleTableRows', () => {
  it('derives active, pending, and assigned member counts per role', () => {
    const rows = buildGroupRoleTableRows(roles, members)

    expect(rows).toEqual([
      {
        id: '1',
        title: 'Researcher',
        activeMemberCount: 1,
        assignedMemberCount: 2,
        pendingMemberCount: 1,
      },
      {
        id: '2',
        title: 'Writer',
        activeMemberCount: 0,
        assignedMemberCount: 0,
        pendingMemberCount: 0,
      },
    ])
  })
})
