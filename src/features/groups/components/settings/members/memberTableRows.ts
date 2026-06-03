import type { GroupSettingsMember } from '../types'
import type { GroupPermission } from '@/features/groups/lib/groupPermissions'
import { canManagePrivilegedAccess, isPrivilegedPermission } from '@/features/groups/lib/groupPermissions'

export interface GroupMemberTableRow extends GroupSettingsMember {
  accessDisabledReason: string | null
  canRemove: boolean
  canSelect: boolean
  displayName: string
  joinedAtLabel: string
  managementDisabledReason: string | null
  removeDisabledReason: string | null
}

interface BuildGroupMemberTableRowsOptions {
  currentUserId: string
  currentUserPermission: GroupPermission
  hasActivePairing: boolean
  members: GroupSettingsMember[]
}

export function buildGroupMemberTableRows({
  currentUserId,
  currentUserPermission,
  hasActivePairing,
  members,
}: BuildGroupMemberTableRowsOptions): GroupMemberTableRow[] {
  const confirmedOwnerCount = members.filter(member => member.permission === 'owner' && !member.isPending).length

  return members.map((member) => {
    const trimmedFullName = member.fullName?.trim()
    const displayName = trimmedFullName !== undefined && trimmedFullName.length > 0
      ? trimmedFullName
      : member.email
    const isLastConfirmedOwner = member.permission === 'owner' && !member.isPending && confirmedOwnerCount <= 1
    const managementDisabledReason = member.isOptimistic === true
      ? 'Please wait for the invited member to finish syncing before managing them.'
      : isPrivilegedPermission(member.permission) && !canManagePrivilegedAccess(currentUserPermission)
        ? 'Only group owners can manage owners or admins.'
        : null
    let accessDisabledReason = managementDisabledReason
    if (accessDisabledReason === null && isLastConfirmedOwner) {
      accessDisabledReason = 'Add or promote another owner before changing this owner access.'
    }
    if (accessDisabledReason === null && !canManagePrivilegedAccess(currentUserPermission)) {
      accessDisabledReason = 'Only group owners can change member access.'
    }
    let removeDisabledReason = managementDisabledReason
    if (removeDisabledReason === null && isLastConfirmedOwner) {
      removeDisabledReason = 'Add or promote another owner before removing this owner.'
    }
    if (removeDisabledReason === null && member.userId === currentUserId) {
      removeDisabledReason = 'Use a dedicated leave-group flow instead of removing yourself from settings.'
    }
    if (removeDisabledReason === null && hasActivePairing && !member.isPending) {
      removeDisabledReason = 'Reset the active pairing before removing this confirmed member.'
    }

    return {
      ...member,
      accessDisabledReason,
      canSelect: managementDisabledReason === null,
      canRemove: removeDisabledReason === null,
      displayName,
      joinedAtLabel: new Date(member.joinedAt).toLocaleDateString(),
      managementDisabledReason,
      removeDisabledReason,
    }
  })
}
