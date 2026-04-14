import { describe, expect, it } from 'vitest'
import { addGroupMembersSchema } from '../schemas/groupManagement'
import { importGroupMemberInvites, MAX_GROUP_MEMBER_INVITES } from './groupMemberInviteBatch'

const roles = [
  { id: '1', title: 'Owner' },
  { id: '2', title: 'Researcher' },
  { id: '3', title: 'Reviewer' },
]

describe('importGroupMemberInvites', () => {
  it('resolves role and access columns while skipping duplicates and invalid emails', () => {
    const result = importGroupMemberInvites({
      existingInvites: [{ email: 'existing@example.com', roleId: '1', isAdmin: false }],
      roles,
      source: [
        'email,role,access',
        'existing@example.com,Owner,member',
        'alpha@example.com,Reviewer,admin',
        'beta@example.com,Unknown role,member',
        'not-an-email,Researcher,admin',
      ].join('\n'),
      defaultRoleId: '2',
      defaultIsAdmin: false,
    })

    expect(result.invites).toEqual([
      { email: 'existing@example.com', roleId: '1', isAdmin: false },
      { email: 'alpha@example.com', roleId: '3', isAdmin: true },
      { email: 'beta@example.com', roleId: '2', isAdmin: false },
    ])
    expect(result.summary).toEqual({
      addedCount: 2,
      duplicateCount: 1,
      invalidCount: 1,
      unresolvedRoleCount: 1,
      truncatedCount: 0,
    })
  })

  it('stops importing after the maximum invite count is reached', () => {
    const result = importGroupMemberInvites({
      existingInvites: [],
      roles,
      source: Array.from({ length: MAX_GROUP_MEMBER_INVITES + 2 }, (_, index) => `person-${index + 1}@example.com`).join('\n'),
      defaultRoleId: '2',
      defaultIsAdmin: false,
    })

    expect(result.invites).toHaveLength(MAX_GROUP_MEMBER_INVITES)
    expect(result.summary.truncatedCount).toBe(2)
  })
})

describe('addGroupMembersSchema', () => {
  it('rejects batches larger than 20 invites', () => {
    const result = addGroupMembersSchema.safeParse({
      groupId: '6f7e3486-7878-4d0d-a3d8-7e62b5f0af20',
      invites: Array.from({ length: MAX_GROUP_MEMBER_INVITES + 1 }, (_, index) => ({
        email: `person-${index + 1}@example.com`,
        roleId: '2',
        isAdmin: false,
      })),
    })

    expect(result.success).toBe(false)
  })
})
