import type { GroupSettingsMember } from '../types'

export interface GroupMemberTableRow extends GroupSettingsMember {
  canRemove: boolean
  displayName: string
  joinedAtLabel: string
  removeDisabledReason: string | null
}

interface BuildGroupMemberTableRowsOptions {
  currentUserId: string
  hasActivePairing: boolean
  members: GroupSettingsMember[]
}

export function buildGroupMemberTableRows({
  currentUserId,
  hasActivePairing,
  members,
}: BuildGroupMemberTableRowsOptions): GroupMemberTableRow[] {
  return members.map((member) => {
    const trimmedFullName = member.fullName?.trim()
    const displayName = trimmedFullName !== undefined && trimmedFullName.length > 0
      ? trimmedFullName
      : member.email
    const removeDisabledReason = member.isCreator
      ? 'The group creator cannot be removed.'
      : member.userId === currentUserId
        ? 'Use a dedicated leave-group flow instead of removing yourself from settings.'
        : hasActivePairing && !member.isPending
          ? 'Reset the active pairing before removing this confirmed member.'
          : null

    return {
      ...member,
      canRemove: removeDisabledReason === null,
      displayName,
      joinedAtLabel: new Date(member.joinedAt).toLocaleDateString(),
      removeDisabledReason,
    }
  })
}
