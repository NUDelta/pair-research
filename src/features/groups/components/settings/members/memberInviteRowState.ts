import type { ZodIssue } from 'zod'
import type { GroupMemberInviteDraft } from '@/features/groups/lib/groupMemberInviteBatch'
import { MAX_GROUP_MEMBER_INVITES } from '@/features/groups/lib/groupMemberInviteBatch'

export interface InviteRow extends GroupMemberInviteDraft {
  id: string
}

export type InviteRowErrors = Record<string, Partial<Record<'email' | 'roleId', string>>>

export function applySharedAssignmentToInviteRows(
  inviteRows: InviteRow[],
  selectedRowIds: string[],
  assignment: Pick<GroupMemberInviteDraft, 'isAdmin' | 'roleId'>,
) {
  const targetRowIds = selectedRowIds.length > 0
    ? new Set(selectedRowIds)
    : new Set(inviteRows.map(row => row.id))

  return inviteRows.map((row) => {
    if (!targetRowIds.has(row.id)) {
      return row
    }

    return {
      ...row,
      roleId: assignment.roleId,
      isAdmin: assignment.isAdmin,
    }
  })
}

export function buildImportSummaryMessage(summary: {
  addedCount: number
  duplicateCount: number
  invalidCount: number
  unresolvedRoleCount: number
  truncatedCount: number
}) {
  const segments = [`Imported ${summary.addedCount} ${summary.addedCount === 1 ? 'member' : 'members'}.`]

  if (summary.duplicateCount > 0) {
    segments.push(`Skipped ${summary.duplicateCount} duplicate ${summary.duplicateCount === 1 ? 'entry' : 'entries'}.`)
  }

  if (summary.invalidCount > 0) {
    segments.push(`Skipped ${summary.invalidCount} invalid ${summary.invalidCount === 1 ? 'row' : 'rows'}.`)
  }

  if (summary.unresolvedRoleCount > 0) {
    segments.push(`Used the shared role for ${summary.unresolvedRoleCount} ${summary.unresolvedRoleCount === 1 ? 'row' : 'rows'} with unknown roles.`)
  }

  if (summary.truncatedCount > 0) {
    segments.push(`Reached the ${MAX_GROUP_MEMBER_INVITES}-member limit and left ${summary.truncatedCount} ${summary.truncatedCount === 1 ? 'row' : 'rows'} out.`)
  }

  return segments.join(' ')
}

export function buildInviteRowErrors(inviteRows: InviteRow[], issues: ZodIssue[]): InviteRowErrors {
  return issues.reduce<InviteRowErrors>((errors, issue) => {
    const [scope, rowIndex, field] = issue.path
    if (scope !== 'invites' || typeof rowIndex !== 'number' || typeof field !== 'string') {
      return errors
    }

    const row = inviteRows[rowIndex]
    if (row === undefined || (field !== 'email' && field !== 'roleId')) {
      return errors
    }

    return {
      ...errors,
      [row.id]: {
        ...errors[row.id],
        [field]: issue.message,
      },
    }
  }, {})
}

export function omitInviteRowError(currentErrors: InviteRowErrors, rowId: string) {
  const { [rowId]: _removed, ...remainingErrors } = currentErrors
  return remainingErrors
}

export function syncInviteRowRoles(inviteRows: InviteRow[], roleIds: Set<string>, fallbackRoleId: string) {
  return inviteRows.map((row) => {
    if (roleIds.has(row.roleId)) {
      return row
    }

    return {
      ...row,
      roleId: fallbackRoleId,
    }
  })
}
