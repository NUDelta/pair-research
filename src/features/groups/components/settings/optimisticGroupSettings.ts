import type { Draft } from 'immer'
import type { GroupSettingsData, GroupSettingsMember, GroupSettingsRole } from './types'
import type { GroupMemberInviteDraft } from '@/features/groups/lib/groupMemberInviteBatch'
import { applyPatches, enablePatches, produceWithPatches } from 'immer'
import { normalizeNullableDescription, normalizeRoleTitle } from '@/features/groups/lib/groupNormalization'
import { resolveBulkRoleActionPlan } from '@/features/groups/lib/groupRoleBulkActions'

enablePatches()

export type GroupSettingsOptimisticRecipe = (draft: Draft<GroupSettingsData>) => void
export type ApplyGroupSettingsOptimisticUpdate = (recipe: GroupSettingsOptimisticRecipe) => () => void

interface GroupSettingsOptimisticUpdate {
  nextState: GroupSettingsData
  rollback: (currentState: GroupSettingsData) => GroupSettingsData
}

interface ApplyGroupBasicsInput {
  description: string
  name: string
}

interface ApplyBulkMemberRoleUpdateInput {
  roleId: string
  userIds: string[]
}

interface ApplyBulkRoleActionInput {
  action: 'merge' | 'remove'
  selectedRoleIds: string[]
  targetRoleId?: string
  targetRoleTitle?: string
  tempRoleId?: string
}

interface ApplyGroupMemberInviteInput {
  invites: GroupMemberInviteDraft[]
  tempMembers: Array<Pick<GroupSettingsMember, 'email' | 'isAdmin' | 'joinedAt' | 'roleId' | 'userId'>>
}

interface ApplyMemberUpdateInput {
  isAdmin: boolean
  roleId: string
  userId: string
}

interface ApplyRoleDeleteInput {
  replacementRoleId?: string
  roleId: string
}

interface ApplyRoleUpdateInput {
  roleId: string
  title: string
}

function getRole(draft: Draft<GroupSettingsData>, roleId: string) {
  return draft.roles.find(role => role.id === roleId)
}

function getRoleTitle(draft: Draft<GroupSettingsData>, roleId: string) {
  return getRole(draft, roleId)?.title
}

function assignRoleToMembers(
  draft: Draft<GroupSettingsData>,
  roleId: string,
  roleTitle: string,
  userIds: string[],
) {
  const userIdSet = new Set(userIds)

  for (const member of draft.members) {
    if (!userIdSet.has(member.userId)) {
      continue
    }

    member.roleId = roleId
    member.roleTitle = roleTitle
  }
}

export function createGroupSettingsOptimisticUpdate(
  state: GroupSettingsData,
  recipe: GroupSettingsOptimisticRecipe,
): GroupSettingsOptimisticUpdate {
  const [nextState, , inversePatches] = produceWithPatches(state, recipe)

  return {
    nextState,
    rollback: currentState => applyPatches(currentState, inversePatches),
  }
}

export function applyGroupBasicsUpdate(
  draft: Draft<GroupSettingsData>,
  { description, name }: ApplyGroupBasicsInput,
) {
  draft.group.name = name.trim()
  draft.group.description = normalizeNullableDescription(description)
}

export function applyRoleUpdate(
  draft: Draft<GroupSettingsData>,
  { roleId, title }: ApplyRoleUpdateInput,
) {
  const role = getRole(draft, roleId)
  if (role === undefined) {
    return false
  }

  const nextTitle = normalizeRoleTitle(title)
  role.title = nextTitle

  for (const member of draft.members) {
    if (member.roleId === roleId) {
      member.roleTitle = nextTitle
    }
  }

  return true
}

export function applyRoleCreate(
  draft: Draft<GroupSettingsData>,
  role: GroupSettingsRole,
) {
  draft.roles.push(role)
}

export function applyRoleDelete(
  draft: Draft<GroupSettingsData>,
  { replacementRoleId, roleId }: ApplyRoleDeleteInput,
) {
  const roleIndex = draft.roles.findIndex(role => role.id === roleId)
  if (roleIndex === -1) {
    return false
  }

  const replacementRoleTitle = replacementRoleId === undefined
    ? undefined
    : getRoleTitle(draft, replacementRoleId)

  if (replacementRoleId !== undefined && replacementRoleTitle === undefined) {
    return false
  }

  draft.roles.splice(roleIndex, 1)

  if (replacementRoleId === undefined || replacementRoleTitle === undefined) {
    return true
  }

  for (const member of draft.members) {
    if (member.roleId !== roleId) {
      continue
    }

    member.roleId = replacementRoleId
    member.roleTitle = replacementRoleTitle
  }

  return true
}

export function applyBulkRoleAction(
  draft: Draft<GroupSettingsData>,
  {
    action,
    selectedRoleIds,
    targetRoleId,
    targetRoleTitle,
    tempRoleId,
  }: ApplyBulkRoleActionInput,
) {
  const plan = resolveBulkRoleActionPlan({
    action,
    roles: draft.roles.map(role => ({
      id: role.id,
      title: role.title,
    })),
    selectedRoleIds,
    targetRoleId,
    targetRoleTitle,
  })

  if (!plan.success) {
    return plan
  }

  if (plan.sourceRoleIds.length === 0) {
    return plan
  }

  let destinationRoleId = plan.targetRoleId

  if (plan.createTargetRole) {
    destinationRoleId = tempRoleId
    if (destinationRoleId === undefined || destinationRoleId.trim() === '') {
      return {
        success: false,
        message: 'Optimistic role creation requires a temporary role id.',
      } as const
    }

    draft.roles.push({
      id: destinationRoleId,
      title: plan.targetRoleTitle,
      isOptimistic: true,
    })
  }

  const sourceRoleIdSet = new Set(plan.sourceRoleIds)
  const membersToMove = draft.members
    .filter(member => sourceRoleIdSet.has(member.roleId))
    .map(member => member.userId)

  if (destinationRoleId !== undefined) {
    assignRoleToMembers(draft, destinationRoleId, plan.targetRoleTitle, membersToMove)
  }

  draft.roles = draft.roles.filter(role => !sourceRoleIdSet.has(role.id))

  return plan
}

export function applyMemberUpdate(
  draft: Draft<GroupSettingsData>,
  { isAdmin, roleId, userId }: ApplyMemberUpdateInput,
) {
  const member = draft.members.find(currentMember => currentMember.userId === userId)
  const roleTitle = getRoleTitle(draft, roleId)

  if (member === undefined || roleTitle === undefined) {
    return false
  }

  member.isAdmin = isAdmin
  member.roleId = roleId
  member.roleTitle = roleTitle
  return true
}

export function applyBulkMemberRoleUpdate(
  draft: Draft<GroupSettingsData>,
  { roleId, userIds }: ApplyBulkMemberRoleUpdateInput,
) {
  const roleTitle = getRoleTitle(draft, roleId)
  if (roleTitle === undefined) {
    return false
  }

  assignRoleToMembers(draft, roleId, roleTitle, userIds)
  return true
}

export function applyMemberRemoval(
  draft: Draft<GroupSettingsData>,
  userIds: string[],
) {
  const userIdSet = new Set(userIds)
  draft.members = draft.members.filter(member => !userIdSet.has(member.userId))
}

export function applyGroupMemberInvites(
  draft: Draft<GroupSettingsData>,
  { invites, tempMembers }: ApplyGroupMemberInviteInput,
) {
  const tempMemberLookup = new Map(tempMembers.map(member => [member.email, member]))

  for (const invite of invites) {
    const tempMember = tempMemberLookup.get(invite.email)
    const roleTitle = getRoleTitle(draft, invite.roleId)

    if (tempMember === undefined || roleTitle === undefined) {
      continue
    }

    draft.members.push({
      userId: tempMember.userId,
      fullName: null,
      avatarUrl: null,
      email: invite.email,
      roleId: invite.roleId,
      roleTitle,
      isAdmin: invite.isAdmin,
      isPending: true,
      joinedAt: tempMember.joinedAt,
      isCreator: false,
      isOptimistic: true,
    })
  }
}
