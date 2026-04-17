import type { GroupSettingsMember, GroupSettingsRole } from '../types'

export interface GroupRoleTableRow extends GroupSettingsRole {
  activeMemberCount: number
  assignedMemberCount: number
  pendingMemberCount: number
}

export function buildGroupRoleTableRows(
  roles: GroupSettingsRole[],
  members: GroupSettingsMember[],
): GroupRoleTableRow[] {
  return roles.map((role) => {
    const assignedMembers = members.filter(member => member.roleId === role.id)
    const activeMembers = assignedMembers.filter(member => !member.isPending)
    const pendingMembers = assignedMembers.filter(member => member.isPending)

    return {
      ...role,
      activeMemberCount: activeMembers.length,
      assignedMemberCount: assignedMembers.length,
      pendingMemberCount: pendingMembers.length,
    }
  })
}
