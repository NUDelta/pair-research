import type { ChangeEvent } from 'react'
import type { ApplyGroupSettingsOptimisticUpdate } from '../optimisticGroupSettings'
import type { GroupSettingsRole } from '../types'
import type { InviteRow, InviteRowErrors } from './memberInviteRowState'
import type { GroupMemberInviteDraft } from '@/features/groups/lib/groupMemberInviteBatch'
import type { GroupPermission } from '@/features/groups/lib/groupPermissions'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  createEmptyGroupMemberInviteDraft,
  importGroupMemberInvites,
  MAX_GROUP_MEMBER_INVITES,
} from '@/features/groups/lib/groupMemberInviteBatch'
import { canAssignGroupPermission, getAssignableGroupPermissions } from '@/features/groups/lib/groupPermissions'
import { addGroupMembersSchema } from '@/features/groups/schemas/groupManagement'
import { addGroupMembers } from '@/features/groups/server/groups/addGroupMembers'
import { applyGroupMemberInvites } from '../optimisticGroupSettings'
import {
  applySharedAssignmentToInviteRows,
  buildImportSummaryMessage,
  buildInviteRowErrors,
  omitInviteRowError,
  syncInviteRowRoles,
} from './memberInviteRowState'

const addGroupMembersFormSchema = addGroupMembersSchema.omit({ groupId: true })

export function useGroupMemberInviteDialog({
  applyOptimisticUpdate,
  currentUserPermission,
  existingMemberEmails = [],
  groupId,
  roles,
}: {
  applyOptimisticUpdate: ApplyGroupSettingsOptimisticUpdate
  currentUserPermission: GroupPermission
  existingMemberEmails?: string[]
  groupId: string
  roles: GroupSettingsRole[]
}) {
  const router = useRouter()
  const addGroupMembersFn = useServerFn(addGroupMembers)
  const [open, setOpen] = useState(false)
  const [draftSource, setDraftSource] = useState('')
  const [storedInviteRows, setStoredInviteRows] = useState<InviteRow[]>([])
  const [rowErrors, setRowErrors] = useState<InviteRowErrors>({})
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([])
  const [defaultPermission, setDefaultPermission] = useState<GroupPermission>('member')
  const [defaultRoleId, setDefaultRoleId] = useState(roles[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const nextRowIdRef = useRef(0)
  const nextOptimisticMemberIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const availablePermissions = useMemo(
    () => getAssignableGroupPermissions(currentUserPermission),
    [currentUserPermission],
  )
  const roleIds = useMemo(() => new Set(roles.map(role => role.id)), [roles])
  const resolvedDefaultRoleId = roleIds.has(defaultRoleId) ? defaultRoleId : (roles[0]?.id ?? '')
  const resolvedDefaultPermission = canAssignGroupPermission(currentUserPermission, defaultPermission)
    ? defaultPermission
    : 'member'
  const inviteRows = useMemo(
    () => syncInviteRowRoles(storedInviteRows, roleIds, resolvedDefaultRoleId)
      .map(row => ({
        ...row,
        permission: canAssignGroupPermission(currentUserPermission, row.permission)
          ? row.permission
          : 'member',
      })),
    [currentUserPermission, resolvedDefaultRoleId, roleIds, storedInviteRows],
  )
  const selectedRowIdSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds])
  const hasPrivilegedInvite = inviteRows.some(row => row.permission !== 'member')

  function sanitizeInviteDraft(draft: GroupMemberInviteDraft): GroupMemberInviteDraft {
    return {
      ...draft,
      permission: canAssignGroupPermission(currentUserPermission, draft.permission)
        ? draft.permission
        : 'member',
    }
  }

  function resetDialogState() {
    setDraftSource('')
    setStoredInviteRows([])
    setRowErrors({})
    setSelectedRowIds([])
    setDefaultPermission('member')
    setDefaultRoleId(roles[0]?.id ?? '')
  }

  function createInviteRow(draft: GroupMemberInviteDraft): InviteRow {
    nextRowIdRef.current += 1
    return { id: `invite-${nextRowIdRef.current}`, ...sanitizeInviteDraft(draft) }
  }

  function createOptimisticMembers(invites: GroupMemberInviteDraft[]) {
    return invites.map((invite) => {
      nextOptimisticMemberIdRef.current += 1

      return {
        userId: `optimistic-member-${nextOptimisticMemberIdRef.current}`,
        email: invite.email,
        roleId: invite.roleId,
        permission: invite.permission,
        joinedAt: new Date().toISOString(),
      }
    })
  }

  function handleImportSource(source: string) {
    const trimmedSource = source.trim()
    if (trimmedSource.length === 0) {
      toast.error('Paste emails or upload a CSV before importing.')
      return
    }

    const existingInviteEmails = new Set(
      inviteRows.map(row => row.email.trim().toLowerCase()),
    )
    const { ignoredExistingEmails, invites, summary } = importGroupMemberInvites({
      existingInvites: inviteRows.map(({ email, roleId, permission }) => ({ email, roleId, permission })),
      existingMemberEmails,
      roles,
      source: trimmedSource,
      defaultRoleId: resolvedDefaultRoleId,
      defaultPermission: resolvedDefaultPermission,
    })

    if (summary.existingMemberCount > 0) {
      toast.warning(
        summary.existingMemberCount === 1
          ? '1 user is already in this group and was ignored.'
          : `${summary.existingMemberCount} users are already in this group and were ignored.`,
        {
          description: ignoredExistingEmails.join('\n'),
        },
      )
    }

    if (summary.addedCount === 0) {
      if (summary.existingMemberCount > 0 && summary.duplicateCount === 0 && summary.invalidCount === 0 && summary.unresolvedRoleCount === 0 && summary.truncatedCount === 0) {
        return
      }

      toast.error(buildImportSummaryMessage(summary))
      return
    }

    const newlyImportedInvites = invites.filter(
      invite => !existingInviteEmails.has(invite.email.trim().toLowerCase()),
    )

    setStoredInviteRows(currentRows => [
      ...currentRows,
      ...newlyImportedInvites.map(createInviteRow),
    ])
    setDraftSource('')
    toast.success(buildImportSummaryMessage(summary))
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file === undefined) {
      return
    }

    handleImportSource(await file.text())
    event.target.value = ''
  }

  function handleAddBlankRow() {
    if (inviteRows.length >= MAX_GROUP_MEMBER_INVITES) {
      toast.error(`You can prepare at most ${MAX_GROUP_MEMBER_INVITES} member invites at a time.`)
      return
    }
    setStoredInviteRows(currentRows => [...currentRows, createInviteRow(createEmptyGroupMemberInviteDraft(resolvedDefaultRoleId))])
  }

  function handleUpdateRow(rowId: string, nextRow: GroupMemberInviteDraft) {
    setStoredInviteRows(currentRows => currentRows.map(row => row.id === rowId ? { ...row, ...sanitizeInviteDraft(nextRow) } : row))
    clearRowErrors(rowId)
  }

  function handleRemoveRow(rowId: string) {
    setStoredInviteRows(currentRows => currentRows.filter(row => row.id !== rowId))
    setSelectedRowIds(currentRowIds => currentRowIds.filter(selectedRowId => selectedRowId !== rowId))
    setRowErrors(currentErrors => omitInviteRowError(currentErrors, rowId))
  }

  function handleApplyAssignment() {
    setStoredInviteRows(currentRows => applySharedAssignmentToInviteRows(currentRows, selectedRowIds, {
      roleId: resolvedDefaultRoleId,
      permission: resolvedDefaultPermission,
    }))
  }

  function handleDialogToggle(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetDialogState()
    }
  }

  function handleCancel() {
    resetDialogState()
    setOpen(false)
  }

  function toggleRowSelection(rowId: string, checked: boolean) {
    setSelectedRowIds((currentRowIds) => {
      if (checked) {
        return currentRowIds.includes(rowId) ? currentRowIds : [...currentRowIds, rowId]
      }

      return currentRowIds.filter(currentRowId => currentRowId !== rowId)
    })
  }

  function handleUpdateDefaultPermission(permission: GroupPermission) {
    setDefaultPermission(canAssignGroupPermission(currentUserPermission, permission) ? permission : 'member')
  }

  function handleSubmit() {
    const validationResult = addGroupMembersFormSchema.safeParse({
      invites: inviteRows.map(({ email, roleId, permission }) => sanitizeInviteDraft({ email, roleId, permission })),
    })

    if (!validationResult.success) {
      setRowErrors(buildInviteRowErrors(inviteRows, validationResult.error.issues))
      toast.error(validationResult.error.issues[0]?.message ?? 'Review the pending invites and try again.')
      return
    }

    const optimisticInvites = validationResult.data.invites.map(invite => ({
      email: invite.email,
      roleId: invite.roleId,
      permission: invite.permission,
    }))
    const optimisticMembers = createOptimisticMembers(optimisticInvites)
    const rollback = applyOptimisticUpdate((draft) => {
      applyGroupMemberInvites(draft, {
        invites: optimisticInvites,
        tempMembers: optimisticMembers,
      })
    })

    resetDialogState()
    setOpen(false)

    startTransition(async () => {
      const response = await addGroupMembersFn({
        data: {
          groupId,
          invites: validationResult.data.invites,
        },
      })

      if (!response.success) {
        rollback()
        toast.error(response.message)
        return
      }
      toast.success(response.message)
      void router.invalidate()
    })
  }

  function clearRowErrors(rowId: string) {
    setRowErrors(currentErrors => omitInviteRowError(currentErrors, rowId))
  }

  return {
    availablePermissions,
    defaultPermission: resolvedDefaultPermission,
    defaultRoleId: resolvedDefaultRoleId,
    draftSource,
    fileInputRef,
    handleAddBlankRow,
    handleApplyAssignment,
    handleCancel,
    handleDialogToggle,
    handleFileChange,
    handleImportSource,
    handleRemoveRow,
    handleSubmit,
    handleUpdateRow,
    hasPrivilegedInvite,
    inviteRows,
    isPending,
    open,
    rowErrors,
    selectedRowIdSet,
    selectedRowIds,
    setDefaultPermission: handleUpdateDefaultPermission,
    setDefaultRoleId,
    setDraftSource,
    setSelectedRowIds,
    toggleRowSelection,
  }
}
