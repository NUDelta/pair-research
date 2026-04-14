interface GroupManagementMember {
  userId: string
  isAdmin: boolean
  isPending: boolean
}

interface MemberAdminUpdateRuleInput {
  actorUserId: string
  creatorId: string
  members: GroupManagementMember[]
  targetUserId: string
  nextIsAdmin: boolean
}

interface MemberRemovalRuleInput {
  actorUserId: string
  creatorId: string
  hasActivePairing: boolean
  members: GroupManagementMember[]
  targetUserId: string
}

interface BulkMemberRoleUpdateRuleInput {
  members: GroupManagementMember[]
  targetUserIds: string[]
}

interface GroupRoleDeleteRuleInput {
  members: Array<{ roleId: string }>
  replacementRoleId?: string
  roleIds: string[]
  targetRoleId: string
}

export function countConfirmedAdmins(members: GroupManagementMember[]) {
  return members.filter(member => member.isAdmin && !member.isPending).length
}

export function getAdminUpdateError({
  creatorId,
  members,
  targetUserId,
  nextIsAdmin,
}: MemberAdminUpdateRuleInput): string | null {
  const targetMember = members.find(member => member.userId === targetUserId)

  if (targetMember === undefined) {
    return 'Group member not found.'
  }

  if (targetUserId === creatorId && !nextIsAdmin) {
    return 'The group creator must remain an admin.'
  }

  if (targetMember.isAdmin && !nextIsAdmin && countConfirmedAdmins(members) <= 1) {
    return 'At least one confirmed admin must remain in the group.'
  }

  return null
}

export function getMemberRemovalError({
  actorUserId,
  creatorId,
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

  if (targetUserId === creatorId) {
    return 'The group creator cannot be removed.'
  }

  if (targetMember.isAdmin && !targetMember.isPending && countConfirmedAdmins(members) <= 1) {
    return 'At least one confirmed admin must remain in the group.'
  }

  if (hasActivePairing && !targetMember.isPending) {
    return 'Reset the active pairing before removing a confirmed member.'
  }

  return null
}

export function getBulkMemberRoleUpdateError({
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
