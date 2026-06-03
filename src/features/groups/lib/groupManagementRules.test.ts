import { describe, expect, it } from 'vitest'
import {
  countConfirmedOwners,
  getBulkMemberRoleUpdateError,
  getGroupRoleDeleteError,
  getMemberRemovalError,
  getPermissionUpdateError,
} from './groupManagementRules'

const baseMembers = [
  { userId: 'owner-1', permission: 'owner' as const, isPending: false },
  { userId: 'admin-2', permission: 'admin' as const, isPending: false },
  { userId: 'member-1', permission: 'member' as const, isPending: false },
  { userId: 'pending-1', permission: 'member' as const, isPending: true },
]

const baseRoleIds = ['role-a', 'role-b', 'role-c']

describe('groupManagementRules', () => {
  it('counts only confirmed owners', () => {
    expect(countConfirmedOwners(baseMembers)).toBe(1)
    expect(countConfirmedOwners([
      { userId: 'pending-owner', permission: 'owner', isPending: true },
    ])).toBe(0)
  })

  it('prevents non-owners from managing privileged access', () => {
    expect(getPermissionUpdateError({
      actorUserId: 'admin-2',
      actorPermission: 'admin',
      members: baseMembers,
      targetUserId: 'member-1',
      nextPermission: 'admin',
    })).toBe('Only group owners can manage owner or admin access.')
  })

  it('prevents removing the last confirmed owner role', () => {
    expect(getPermissionUpdateError({
      actorUserId: 'owner-1',
      actorPermission: 'owner',
      members: [
        { userId: 'owner-1', permission: 'owner', isPending: false },
        { userId: 'member-1', permission: 'member', isPending: false },
      ],
      targetUserId: 'owner-1',
      nextPermission: 'admin',
    })).toBe('At least one confirmed owner must remain in the group.')

    expect(getPermissionUpdateError({
      actorUserId: 'owner-1',
      actorPermission: 'owner',
      members: [
        { userId: 'owner-1', permission: 'owner', isPending: false },
        { userId: 'owner-2', permission: 'owner', isPending: false },
      ],
      targetUserId: 'owner-2',
      nextPermission: 'admin',
    })).toBeNull()
  })

  it('prevents self-removal, non-owner privileged removal, and removing the last owner', () => {
    expect(getMemberRemovalError({
      actorUserId: 'owner-1',
      actorPermission: 'owner',
      hasActivePairing: false,
      members: baseMembers,
      targetUserId: 'owner-1',
    })).toBe('You cannot remove yourself from group settings.')

    expect(getMemberRemovalError({
      actorUserId: 'admin-2',
      actorPermission: 'admin',
      hasActivePairing: false,
      members: baseMembers,
      targetUserId: 'owner-1',
    })).toBe('Only group owners can remove owners or admins.')

    expect(getMemberRemovalError({
      actorUserId: 'admin-2',
      actorPermission: 'admin',
      hasActivePairing: false,
      members: [
        { userId: 'owner-1', permission: 'owner', isPending: false },
        { userId: 'member-1', permission: 'member', isPending: false },
      ],
      targetUserId: 'owner-1',
    })).toBe('Only group owners can remove owners or admins.')
  })

  it('blocks confirmed member removal while a pairing is active', () => {
    expect(getMemberRemovalError({
      actorUserId: 'owner-1',
      actorPermission: 'owner',
      hasActivePairing: true,
      members: baseMembers,
      targetUserId: 'member-1',
    })).toBe('Reset the active pairing before removing a confirmed member.')

    expect(getMemberRemovalError({
      actorUserId: 'owner-1',
      actorPermission: 'owner',
      hasActivePairing: true,
      members: baseMembers,
      targetUserId: 'pending-1',
    })).toBeNull()
  })

  it('validates selected members for bulk role updates', () => {
    expect(getBulkMemberRoleUpdateError({
      actorPermission: 'owner',
      members: baseMembers,
      targetUserIds: [],
    })).toBe('Select at least one member to update.')

    expect(getBulkMemberRoleUpdateError({
      actorPermission: 'owner',
      members: baseMembers,
      targetUserIds: ['member-1', 'missing-user'],
    })).toBe('One or more selected members are no longer in this group.')

    expect(getBulkMemberRoleUpdateError({
      actorPermission: 'owner',
      members: baseMembers,
      targetUserIds: ['owner-1', 'member-1'],
    })).toBeNull()

    expect(getBulkMemberRoleUpdateError({
      actorPermission: 'admin',
      members: baseMembers,
      targetUserIds: ['admin-2'],
    })).toBe('Only group owners can update owners or admins.')
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
