import { describe, expect, it } from 'vitest'
import {
  countConfirmedAdmins,
  getAdminUpdateError,
  getBulkMemberRoleUpdateError,
  getGroupRoleDeleteError,
  getMemberRemovalError,
} from './groupManagementRules'

const baseMembers = [
  { userId: 'creator', isAdmin: true, isPending: false },
  { userId: 'admin-2', isAdmin: true, isPending: false },
  { userId: 'member-1', isAdmin: false, isPending: false },
  { userId: 'pending-1', isAdmin: false, isPending: true },
]

const baseRoleIds = ['role-a', 'role-b', 'role-c']

describe('groupManagementRules', () => {
  it('counts only confirmed admins', () => {
    expect(countConfirmedAdmins(baseMembers)).toBe(2)
    expect(countConfirmedAdmins([
      { userId: 'pending-admin', isAdmin: true, isPending: true },
    ])).toBe(0)
  })

  it('prevents creator demotion', () => {
    expect(getAdminUpdateError({
      actorUserId: 'admin-2',
      creatorId: 'creator',
      members: baseMembers,
      targetUserId: 'creator',
      nextIsAdmin: false,
    })).toBe('The group creator must remain an admin.')
  })

  it('prevents removing the last confirmed admin role', () => {
    expect(getAdminUpdateError({
      actorUserId: 'creator',
      creatorId: 'creator',
      members: [
        { userId: 'creator', isAdmin: true, isPending: false },
        { userId: 'member-1', isAdmin: false, isPending: false },
      ],
      targetUserId: 'creator',
      nextIsAdmin: false,
    })).toBe('The group creator must remain an admin.')

    expect(getAdminUpdateError({
      actorUserId: 'creator',
      creatorId: 'creator',
      members: [
        { userId: 'creator', isAdmin: true, isPending: false },
        { userId: 'admin-2', isAdmin: true, isPending: false },
      ],
      targetUserId: 'admin-2',
      nextIsAdmin: false,
    })).toBeNull()
  })

  it('prevents self-removal, creator removal, and removing the last admin', () => {
    expect(getMemberRemovalError({
      actorUserId: 'creator',
      creatorId: 'creator',
      hasActivePairing: false,
      members: baseMembers,
      targetUserId: 'creator',
    })).toBe('You cannot remove yourself from group settings.')

    expect(getMemberRemovalError({
      actorUserId: 'admin-2',
      creatorId: 'creator',
      hasActivePairing: false,
      members: baseMembers,
      targetUserId: 'creator',
    })).toBe('The group creator cannot be removed.')

    expect(getMemberRemovalError({
      actorUserId: 'creator',
      creatorId: 'creator',
      hasActivePairing: false,
      members: [
        { userId: 'creator', isAdmin: true, isPending: false },
        { userId: 'member-1', isAdmin: false, isPending: false },
      ],
      targetUserId: 'creator',
    })).toBe('You cannot remove yourself from group settings.')
  })

  it('blocks confirmed member removal while a pairing is active', () => {
    expect(getMemberRemovalError({
      actorUserId: 'creator',
      creatorId: 'creator',
      hasActivePairing: true,
      members: baseMembers,
      targetUserId: 'member-1',
    })).toBe('Reset the active pairing before removing a confirmed member.')

    expect(getMemberRemovalError({
      actorUserId: 'creator',
      creatorId: 'creator',
      hasActivePairing: true,
      members: baseMembers,
      targetUserId: 'pending-1',
    })).toBeNull()
  })

  it('validates selected members for bulk role updates', () => {
    expect(getBulkMemberRoleUpdateError({
      members: baseMembers,
      targetUserIds: [],
    })).toBe('Select at least one member to update.')

    expect(getBulkMemberRoleUpdateError({
      members: baseMembers,
      targetUserIds: ['member-1', 'missing-user'],
    })).toBe('One or more selected members are no longer in this group.')

    expect(getBulkMemberRoleUpdateError({
      members: baseMembers,
      targetUserIds: ['creator', 'member-1'],
    })).toBeNull()
  })

  it('requires a safe replacement when deleting an assigned role', () => {
    const roleMembers = [
      { roleId: 'role-a' },
      { roleId: 'role-a' },
      { roleId: 'role-b' },
    ]

    expect(getGroupRoleDeleteError({
      members: roleMembers,
      roleIds: ['role-a'],
      targetRoleId: 'role-a',
    })).toBe('Create another role before deleting the last remaining role.')

    expect(getGroupRoleDeleteError({
      members: roleMembers,
      roleIds: baseRoleIds,
      targetRoleId: 'role-a',
    })).toBe('Choose a replacement role for members assigned to this role.')

    expect(getGroupRoleDeleteError({
      members: roleMembers,
      replacementRoleId: 'role-a',
      roleIds: baseRoleIds,
      targetRoleId: 'role-a',
    })).toBe('Choose a different replacement role.')

    expect(getGroupRoleDeleteError({
      members: roleMembers,
      replacementRoleId: 'missing-role',
      roleIds: baseRoleIds,
      targetRoleId: 'role-a',
    })).toBe('Replacement role not found.')

    expect(getGroupRoleDeleteError({
      members: roleMembers,
      replacementRoleId: 'role-b',
      roleIds: baseRoleIds,
      targetRoleId: 'role-a',
    })).toBeNull()
  })

  it('allows deleting an unassigned role when another role remains', () => {
    expect(getGroupRoleDeleteError({
      members: [{ roleId: 'role-a' }],
      roleIds: baseRoleIds,
      targetRoleId: 'role-c',
    })).toBeNull()
  })
})
