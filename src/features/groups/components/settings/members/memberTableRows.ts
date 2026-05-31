import type { GroupSettingsMember } from '../types'
import type { GroupPermission } from '@/features/groups/lib/groupPermissions'
import { canManagePrivilegedAccess, isPrivilegedPermission } from '@/features/groups/lib/groupPermissions'

export interface GroupMemberTableRow extends GroupSettingsMember {
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
  return members.map((member) => {
    const trimmedFullName = member.fullName?.trim()
    const displayName = trimmedFullName !== undefined && trimmedFullName.length > 0
      ? trimmedFullName
      : member.email
    const managementDisabledReason = member.isOptimistic === true
      ? 'Please wait for the invited member to finish syncing before managing them.'
      : isPrivilegedPermission(member.permission) && !canManagePrivilegedAccess(currentUserPermission)
        ? 'Only group owners can manage owners or admins.'
        : null
    const removeDisabledReason = managementDisabledReason
      ?? (member.userId === currentUserId
        ? 'Use a dedicated leave-group flow instead of removing yourself from settings.'
        : hasActivePairing && !member.isPending
          ? 'Reset the active pairing before removing this confirmed member.'
          : null)

    return {
      ...member,
      canSelect: managementDisabledReason === null,
      canRemove: removeDisabledReason === null,
      displayName,
      joinedAtLabel: new Date(member.joinedAt).toLocaleDateString(),
      managementDisabledReason,
      removeDisabledReason,
    }
  })
}
