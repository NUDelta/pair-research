import type { GroupPermission } from './groupPermissions'
import { canManagePrivilegedAccess, isPrivilegedPermission } from './groupPermissions'

interface GroupManagementMember {
  userId: string
  permission: GroupPermission
  isPending: boolean
}

interface MemberPermissionUpdateRuleInput {
  actorUserId: string
  actorPermission: GroupPermission
  members: GroupManagementMember[]
  targetUserId: string
  nextPermission: GroupPermission
}

interface MemberRemovalRuleInput {
  actorUserId: string
  actorPermission: GroupPermission
  hasActivePairing: boolean
  members: GroupManagementMember[]
  targetUserId: string
}

interface BulkMemberRoleUpdateRuleInput {
  actorPermission: GroupPermission
  members: GroupManagementMember[]
  targetUserIds: string[]
}

interface GroupRoleDeleteRuleInput {
  members: Array<{ roleId: string }>
  replacementRoleId?: string
  roleIds: string[]
  targetRoleId: string
}

export function countConfirmedOwners(members: GroupManagementMember[]) {
  return members.filter(member => member.permission === 'owner' && !member.isPending).length
}

export function getPermissionUpdateError({
  actorPermission,
  members,
  targetUserId,
  nextPermission,
}: MemberPermissionUpdateRuleInput): string | null {
  const targetMember = members.find(member => member.userId === targetUserId)

  if (targetMember === undefined) {
    return 'Group member not found.'
  }

  const changesPrivilegedAccess = isPrivilegedPermission(targetMember.permission) || isPrivilegedPermission(nextPermission)
  if (changesPrivilegedAccess && !canManagePrivilegedAccess(actorPermission)) {
    return 'Only group owners can manage owner or admin access.'
  }

  if (
    targetMember.permission === 'owner'
    && nextPermission !== 'owner'
    && !targetMember.isPending
    && countConfirmedOwners(members) <= 1
  ) {
    return 'At least one confirmed owner must remain in the group.'
  }

  return null
}

export function getMemberRemovalError({
  actorUserId,
  actorPermission,
  hasActivePairing,
  members,
  targetUserId,
}: MemberRemovalRuleInput): string | null {
  const targetMember = members.find(member => member.userId === targetUserId)

  if (targetMember === undefined) {
    return 'Group member not found.'
  }

  if (targetUserId === actorUserId) {
    return 'You cannot remove yourself from group settings.'
  }

  if (isPrivilegedPermission(targetMember.permission) && !canManagePrivilegedAccess(actorPermission)) {
    return 'Only group owners can remove owners or admins.'
  }

  if (targetMember.permission === 'owner' && !targetMember.isPending && countConfirmedOwners(members) <= 1) {
    return 'At least one confirmed owner must remain in the group.'
  }

  if (hasActivePairing && !targetMember.isPending) {
    return 'Reset the active pairing before removing a confirmed member.'
  }

  return null
}

export function getBulkMemberRoleUpdateError({
  actorPermission,
  members,
  targetUserIds,
}: BulkMemberRoleUpdateRuleInput): string | null {
  if (targetUserIds.length === 0) {
    return 'Select at least one member to update.'
  }

  const memberIds = new Set(members.map(member => member.userId))

  if (targetUserIds.some(userId => !memberIds.has(userId))) {
    return 'One or more selected members are no longer in this group.'
  }

  if (!canManagePrivilegedAccess(actorPermission)) {
    const privilegedTarget = members.find(member =>
      targetUserIds.includes(member.userId) && isPrivilegedPermission(member.permission),
    )

    if (privilegedTarget !== undefined) {
      return 'Only group owners can update owners or admins.'
    }
  }

  return null
}

export function getGroupRoleDeleteError({
  members,
  replacementRoleId,
  roleIds,
  targetRoleId,
}: GroupRoleDeleteRuleInput): string | null {
  if (!roleIds.includes(targetRoleId)) {
    return 'Role not found.'
  }

  if (roleIds.length <= 1) {
    return 'Create another role before deleting the last remaining role.'
  }

  const assignedMemberCount = members.filter(member => member.roleId === targetRoleId).length

  if (assignedMemberCount === 0) {
    return null
  }

  if (replacementRoleId === undefined) {
    return 'Choose a replacement role for members assigned to this role.'
  }

  if (replacementRoleId === targetRoleId) {
    return 'Choose a different replacement role.'
  }

  if (!roleIds.includes(replacementRoleId)) {
    return 'Replacement role not found.'
  }

  return null
}
