import { describe, expect, it } from 'vitest'
import { buildGroupMemberTableRows } from './memberTableRows'

const members = [
  {
    userId: 'creator-id',
    fullName: 'Creator Person',
    avatarUrl: null,
    email: 'creator@example.com',
    roleId: '1',
    roleTitle: 'Owner',
    isAdmin: true,
    isPending: false,
    joinedAt: '2026-01-10T00:00:00.000Z',
    isCreator: true,
  },
  {
    userId: 'member-id',
    fullName: '  ',
    avatarUrl: null,
    email: 'member@example.com',
    roleId: '2',
    roleTitle: 'Researcher',
    isAdmin: false,
    isPending: false,
    joinedAt: '2026-02-20T00:00:00.000Z',
    isCreator: false,
  },
  {
    userId: 'pending-id',
    fullName: 'Pending Invite',
    avatarUrl: null,
    email: 'pending@example.com',
    roleId: '2',
    roleTitle: 'Researcher',
    isAdmin: false,
    isPending: true,
    joinedAt: '2026-03-01T00:00:00.000Z',
    isCreator: false,
  },
]

describe('buildGroupMemberTableRows', () => {
  it('falls back to email when the full name is empty', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'current-user',
      hasActivePairing: false,
      members,
    })

    expect(rows[1]?.displayName).toBe('member@example.com')
  })

  it('marks creator and current user rows as non-removable with specific reasons', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'member-id',
      hasActivePairing: false,
      members,
    })

    expect(rows[0]?.canRemove).toBe(false)
    expect(rows[0]?.removeDisabledReason).toBe('The group creator cannot be removed.')
    expect(rows[1]?.canRemove).toBe(false)
    expect(rows[1]?.removeDisabledReason).toBe('Use a dedicated leave-group flow instead of removing yourself from settings.')
  })

  it('blocks confirmed members during an active pairing but still allows pending invites', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'someone-else',
      hasActivePairing: true,
      members,
    })

    expect(rows[1]?.canRemove).toBe(false)
    expect(rows[1]?.removeDisabledReason).toBe('Reset the active pairing before removing this confirmed member.')
    expect(rows[2]?.canRemove).toBe(true)
    expect(rows[2]?.removeDisabledReason).toBeNull()
  })
})
