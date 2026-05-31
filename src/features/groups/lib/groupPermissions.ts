export const groupPermissionValues = ['owner', 'admin', 'member'] as const
const memberOnlyPermissionValues = ['member'] as const

export type GroupPermission = typeof groupPermissionValues[number]

export function isGroupPermission(value: string): value is GroupPermission {
  return groupPermissionValues.includes(value as GroupPermission)
}

export function hasGroupManagementAccess(permission: GroupPermission) {
  return permission === 'owner' || permission === 'admin'
}

export function canManagePrivilegedAccess(permission: GroupPermission) {
  return permission === 'owner'
}

export function isPrivilegedPermission(permission: GroupPermission) {
  return permission === 'owner' || permission === 'admin'
}

export function getAssignableGroupPermissions(actorPermission: GroupPermission): readonly GroupPermission[] {
  return canManagePrivilegedAccess(actorPermission)
    ? groupPermissionValues
    : memberOnlyPermissionValues
}

export function canAssignGroupPermission(actorPermission: GroupPermission, permission: GroupPermission) {
  return getAssignableGroupPermissions(actorPermission).includes(permission)
}

export function getGroupPermissionLabel(permission: GroupPermission) {
  if (permission === 'owner') {
    return 'Owner'
  }

  if (permission === 'admin') {
    return 'Admin'
  }

  return 'Member'
}
