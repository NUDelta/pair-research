import type { ChangeEvent } from 'react'
import type { GroupSettingsRole } from '../types'
import type { InviteRow, InviteRowErrors } from './memberInviteRowState'
import type { GroupMemberInviteDraft } from '@/features/groups/lib/groupMemberInviteBatch'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useMemo, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  createEmptyGroupMemberInviteDraft,
  importGroupMemberInvites,
  MAX_GROUP_MEMBER_INVITES,
} from '@/features/groups/lib/groupMemberInviteBatch'
import { addGroupMembersSchema } from '@/features/groups/schemas/groupManagement'
import { addGroupMembers } from '@/features/groups/server/groups/addGroupMembers'
import {
  applySharedAssignmentToInviteRows,
  buildImportSummaryMessage,
  buildInviteRowErrors,
  omitInviteRowError,
  syncInviteRowRoles,
} from './memberInviteRowState'

const addGroupMembersFormSchema = addGroupMembersSchema.omit({ groupId: true })

export function useGroupMemberInviteDialog({
  groupId,
  roles,
}: {
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
  const [defaultIsAdmin, setDefaultIsAdmin] = useState(false)
  const [defaultRoleId, setDefaultRoleId] = useState(roles[0]?.id ?? '')
  const [isPending, startTransition] = useTransition()
  const nextRowIdRef = useRef(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const roleIds = useMemo(() => new Set(roles.map(role => role.id)), [roles])
  const resolvedDefaultRoleId = roleIds.has(defaultRoleId) ? defaultRoleId : (roles[0]?.id ?? '')
  const inviteRows = useMemo(
    () => syncInviteRowRoles(storedInviteRows, roleIds, resolvedDefaultRoleId),
    [resolvedDefaultRoleId, roleIds, storedInviteRows],
  )
  const selectedRowIdSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds])
  const hasAdminInvite = inviteRows.some(row => row.isAdmin)

  function resetDialogState() {
    setDraftSource('')
    setStoredInviteRows([])
    setRowErrors({})
    setSelectedRowIds([])
    setDefaultIsAdmin(false)
    setDefaultRoleId(roles[0]?.id ?? '')
  }

  function createInviteRow(draft: GroupMemberInviteDraft): InviteRow {
    nextRowIdRef.current += 1
    return { id: `invite-${nextRowIdRef.current}`, ...draft }
  }

  function handleImportSource(source: string) {
    const trimmedSource = source.trim()
    if (trimmedSource.length === 0) {
      toast.error('Paste emails or upload a CSV before importing.')
      return
    }

    const { invites, summary } = importGroupMemberInvites({
      existingInvites: inviteRows.map(({ email, roleId, isAdmin }) => ({ email, roleId, isAdmin })),
      roles,
      source: trimmedSource,
      defaultRoleId: resolvedDefaultRoleId,
      defaultIsAdmin,
    })

    if (summary.addedCount === 0) {
      toast.error(buildImportSummaryMessage(summary))
      return
    }

    setStoredInviteRows(currentRows => [
      ...currentRows,
      ...invites.slice(inviteRows.length).map(createInviteRow),
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
    setStoredInviteRows(currentRows => currentRows.map(row => row.id === rowId ? { ...row, ...nextRow } : row))
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
      isAdmin: defaultIsAdmin,
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

  function handleSubmit() {
    const validationResult = addGroupMembersFormSchema.safeParse({
      invites: inviteRows.map(({ email, roleId, isAdmin }) => ({ email, roleId, isAdmin })),
    })

    if (!validationResult.success) {
      setRowErrors(buildInviteRowErrors(inviteRows, validationResult.error.issues))
      toast.error(validationResult.error.issues[0]?.message ?? 'Review the pending invites and try again.')
      return
    }

    startTransition(async () => {
      const response = await addGroupMembersFn({
        data: {
          groupId,
          invites: validationResult.data.invites,
        },
      })

      if (!response.success) {
        toast.error(response.message)
        return
      }
      toast.success(response.message)
      resetDialogState()
      setOpen(false)
      await router.invalidate()
    })
  }

  function clearRowErrors(rowId: string) {
    setRowErrors(currentErrors => omitInviteRowError(currentErrors, rowId))
  }

  return {
    defaultIsAdmin,
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
    hasAdminInvite,
    inviteRows,
    isPending,
    open,
    rowErrors,
    selectedRowIdSet,
    selectedRowIds,
    setDefaultIsAdmin,
    setDefaultRoleId,
    setDraftSource,
    setSelectedRowIds,
    toggleRowSelection,
  }
}
