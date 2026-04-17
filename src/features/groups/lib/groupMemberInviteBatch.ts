import type { GroupSettingsRole } from '../components/settings/types'
import { groupMemberInviteSchema } from '../schemas/groupManagement'
import { parseGroupMemberInviteRows } from './groupMemberInviteCsv'

export const MAX_GROUP_MEMBER_INVITES = 20

export interface GroupMemberInviteDraft {
  email: string
  roleId: string
  isAdmin: boolean
}

export interface GroupMemberInviteImportSummary {
  addedCount: number
  duplicateCount: number
  existingMemberCount: number
  invalidCount: number
  unresolvedRoleCount: number
  truncatedCount: number
}

interface ImportGroupMemberInvitesOptions {
  existingInvites: GroupMemberInviteDraft[]
  existingMemberEmails?: string[]
  roles: GroupSettingsRole[]
  source: string
  defaultRoleId: string
  defaultIsAdmin: boolean
}

const truthyAccessValues = new Set(['1', 'admin', 'administrator', 'full', 'true', 'yes', 'y'])
const falsyAccessValues = new Set(['0', 'false', 'member', 'no', 'n', 'standard', 'user'])

export function createEmptyGroupMemberInviteDraft(defaultRoleId: string): GroupMemberInviteDraft {
  return {
    email: '',
    roleId: defaultRoleId,
    isAdmin: false,
  }
}

export function importGroupMemberInvites({
  existingInvites,
  existingMemberEmails = [],
  roles,
  source,
  defaultRoleId,
  defaultIsAdmin,
}: ImportGroupMemberInvitesOptions) {
  const rows = parseGroupMemberInviteRows(source)
  const existingEmails = new Set(existingInvites.map(invite => normalizeInviteEmail(invite.email)))
  const existingGroupMemberEmails = new Set(existingMemberEmails.map(normalizeInviteEmail))
  const roleLookup = buildRoleLookup(roles)
  const summary: GroupMemberInviteImportSummary = {
    addedCount: 0,
    duplicateCount: 0,
    existingMemberCount: 0,
    invalidCount: 0,
    unresolvedRoleCount: 0,
    truncatedCount: 0,
  }
  const nextInvites = [...existingInvites]
  const ignoredExistingEmails: string[] = []

  for (const row of rows) {
    if (nextInvites.length >= MAX_GROUP_MEMBER_INVITES) {
      summary.truncatedCount += 1
      continue
    }

    const normalizedEmail = normalizeInviteEmail(row.email)
    const parsedInvite = groupMemberInviteSchema.safeParse({
      email: normalizedEmail,
      roleId: defaultRoleId,
      isAdmin: defaultIsAdmin,
    })

    if (!parsedInvite.success) {
      summary.invalidCount += 1
      continue
    }

    if (existingEmails.has(normalizedEmail)) {
      summary.duplicateCount += 1
      continue
    }

    if (existingGroupMemberEmails.has(normalizedEmail)) {
      summary.existingMemberCount += 1
      ignoredExistingEmails.push(normalizedEmail)
      continue
    }

    const resolvedRole = resolveRoleId({
      defaultRoleId,
      roleLookup,
      roleValue: row.roleValue,
    })

    if (!resolvedRole.matchedExplicitRole) {
      summary.unresolvedRoleCount += 1
    }

    nextInvites.push({
      email: normalizedEmail,
      roleId: resolvedRole.roleId,
      isAdmin: resolveAccessValue(row.accessValue, defaultIsAdmin),
    })
    existingEmails.add(normalizedEmail)
    summary.addedCount += 1
  }

  return {
    invites: nextInvites,
    ignoredExistingEmails,
    summary,
  }
}
function buildRoleLookup(roles: GroupSettingsRole[]) {
  return roles.reduce((lookup, role) => {
    lookup.set(role.id, role.id)
    lookup.set(role.title.trim().toLowerCase(), role.id)
    return lookup
  }, new Map<string, string>())
}

function resolveRoleId({
  defaultRoleId,
  roleLookup,
  roleValue,
}: {
  defaultRoleId: string
  roleLookup: Map<string, string>
  roleValue: string | null
}) {
  if (roleValue === null || roleValue.trim().length === 0) {
    return {
      roleId: defaultRoleId,
      matchedExplicitRole: true,
    }
  }

  const normalizedRole = roleValue.trim().toLowerCase()
  const matchedRoleId = roleLookup.get(roleValue.trim()) ?? roleLookup.get(normalizedRole)
  return {
    roleId: matchedRoleId ?? defaultRoleId,
    matchedExplicitRole: matchedRoleId !== undefined,
  }
}

function resolveAccessValue(value: string | null, defaultIsAdmin: boolean) {
  if (value === null || value.trim().length === 0) {
    return defaultIsAdmin
  }

  const normalizedValue = value.trim().toLowerCase()
  if (truthyAccessValues.has(normalizedValue)) {
    return true
  }

  if (falsyAccessValues.has(normalizedValue)) {
    return false
  }

  return defaultIsAdmin
}

function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase()
}
