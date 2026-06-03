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
    permission: 'owner' as const,
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
    permission: 'member' as const,
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
    permission: 'member' as const,
    isPending: true,
    joinedAt: '2026-03-01T00:00:00.000Z',
    isCreator: false,
  },
  {
    userId: 'optimistic-id',
    fullName: null,
    avatarUrl: null,
    email: 'optimistic@example.com',
    roleId: '2',
    roleTitle: 'Researcher',
    permission: 'member' as const,
    isPending: true,
    joinedAt: '2026-03-02T00:00:00.000Z',
    isCreator: false,
    isOptimistic: true,
  },
]

describe('buildGroupMemberTableRows', () => {
  it('falls back to email when the full name is empty', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'current-user',
      currentUserPermission: 'owner',
      hasActivePairing: false,
      members,
    })

    expect(rows[1]?.displayName).toBe('member@example.com')
  })

  it('marks current user rows as non-removable with a specific reason', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'member-id',
      currentUserPermission: 'owner',
      hasActivePairing: false,
      members: [
        ...members,
        {
          ...members[0],
          userId: 'owner-2',
          email: 'owner2@example.com',
          isCreator: false,
        },
      ],
    })

    expect(rows[0]?.canRemove).toBe(true)
    expect(rows[0]?.removeDisabledReason).toBeNull()
    expect(rows[1]?.canRemove).toBe(false)
    expect(rows[1]?.removeDisabledReason).toBe('Use a dedicated leave-group flow instead of removing yourself from settings.')
  })

  it('blocks confirmed members during an active pairing but still allows pending invites', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'someone-else',
      currentUserPermission: 'owner',
      hasActivePairing: true,
      members,
    })

    expect(rows[1]?.canRemove).toBe(false)
    expect(rows[1]?.removeDisabledReason).toBe('Reset the active pairing before removing this confirmed member.')
    expect(rows[2]?.canRemove).toBe(true)
    expect(rows[2]?.removeDisabledReason).toBeNull()
  })

  it('disables selection and management for optimistic invite rows until reconciliation', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'someone-else',
      currentUserPermission: 'owner',
      hasActivePairing: false,
      members,
    })

    expect(rows[3]).toMatchObject({
      accessDisabledReason: 'Please wait for the invited member to finish syncing before managing them.',
      canSelect: false,
      canRemove: false,
      managementDisabledReason: 'Please wait for the invited member to finish syncing before managing them.',
      removeDisabledReason: 'Please wait for the invited member to finish syncing before managing them.',
    })
  })

  it('allows admins to manage member rows without changing access levels', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'admin-id',
      currentUserPermission: 'admin',
      hasActivePairing: false,
      members,
    })

    expect(rows[1]).toMatchObject({
      canSelect: true,
      canRemove: true,
      accessDisabledReason: 'Only group owners can change member access.',
      managementDisabledReason: null,
      removeDisabledReason: null,
    })
  })

  it('blocks admins from managing owner rows', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'admin-id',
      currentUserPermission: 'admin',
      hasActivePairing: false,
      members,
    })

    expect(rows[0]).toMatchObject({
      accessDisabledReason: 'Only group owners can manage owners or admins.',
      canSelect: false,
      canRemove: false,
      managementDisabledReason: 'Only group owners can manage owners or admins.',
      removeDisabledReason: 'Only group owners can manage owners or admins.',
    })
  })

  it('keeps the final confirmed owner from being demoted or removed', () => {
    const rows = buildGroupMemberTableRows({
      currentUserId: 'someone-else',
      currentUserPermission: 'owner',
      hasActivePairing: false,
      members,
    })

    expect(rows[0]).toMatchObject({
      accessDisabledReason: 'Add or promote another owner before changing this owner access.',
      canSelect: true,
      canRemove: false,
      managementDisabledReason: null,
      removeDisabledReason: 'Add or promote another owner before removing this owner.',
    })
  })
})
