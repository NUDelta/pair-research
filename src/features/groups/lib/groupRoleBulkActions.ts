export interface GroupRoleOption {
  id: string
  title: string
}

interface ResolveBulkRoleActionPlanInput {
  action: 'merge' | 'remove'
  roles: GroupRoleOption[]
  selectedRoleIds: string[]
  targetRoleId?: string
  targetRoleTitle?: string
}

interface ResolveBulkRoleActionPlanFailure {
  success: false
  message: string
}

interface ResolveBulkRoleActionPlanSuccess {
  success: true
  createTargetRole: boolean
  sourceRoleIds: string[]
  targetRoleId?: string
  targetRoleTitle: string
}

type ResolveBulkRoleActionPlanResult = ResolveBulkRoleActionPlanFailure | ResolveBulkRoleActionPlanSuccess

function normalizeRoleTitle(title: string) {
  return title.trim()
}

export function resolveBulkRoleActionPlan({
  action,
  roles,
  selectedRoleIds,
  targetRoleId,
  targetRoleTitle,
}: ResolveBulkRoleActionPlanInput): ResolveBulkRoleActionPlanResult {
  const uniqueSelectedRoleIds = [...new Set(selectedRoleIds)]

  if (uniqueSelectedRoleIds.length === 0) {
    return {
      success: false,
      message: 'Select at least one role to continue.',
    }
  }

  const roleMap = new Map(roles.map(role => [role.id, role]))
  if (uniqueSelectedRoleIds.some(roleId => !roleMap.has(roleId))) {
    return {
      success: false,
      message: 'One or more selected roles are no longer available.',
    }
  }

  const selectedRoleIdSet = new Set(uniqueSelectedRoleIds)

  if (targetRoleId !== undefined) {
    const targetRole = roleMap.get(targetRoleId)

    if (targetRole === undefined) {
      return {
        success: false,
        message: 'Target role not found.',
      }
    }

    if (action === 'remove' && selectedRoleIdSet.has(targetRoleId)) {
      return {
        success: false,
        message: 'Choose a replacement role outside the selected roles.',
      }
    }

    return {
      success: true,
      createTargetRole: false,
      sourceRoleIds: uniqueSelectedRoleIds.filter(roleId => roleId !== targetRoleId),
      targetRoleId,
      targetRoleTitle: targetRole.title,
    }
  }

  const normalizedTitle = normalizeRoleTitle(targetRoleTitle ?? '')
  if (normalizedTitle.length === 0) {
    return {
      success: false,
      message: 'Enter a destination role name or choose an existing role.',
    }
  }

  const matchingRole = roles.find(role => role.title.trim().toLowerCase() === normalizedTitle.toLowerCase())
  if (matchingRole !== undefined) {
    if (action === 'remove' && selectedRoleIdSet.has(matchingRole.id)) {
      return {
        success: false,
        message: 'Choose a replacement role outside the selected roles.',
      }
    }

    if (!selectedRoleIdSet.has(matchingRole.id)) {
      return {
        success: false,
        message: 'A role with that title already exists. Choose it as the destination instead.',
      }
    }

    return {
      success: true,
      createTargetRole: false,
      sourceRoleIds: uniqueSelectedRoleIds.filter(roleId => roleId !== matchingRole.id),
      targetRoleId: matchingRole.id,
      targetRoleTitle: matchingRole.title,
    }
  }

  return {
    success: true,
    createTargetRole: true,
    sourceRoleIds: uniqueSelectedRoleIds,
    targetRoleTitle: normalizedTitle,
  }
}
