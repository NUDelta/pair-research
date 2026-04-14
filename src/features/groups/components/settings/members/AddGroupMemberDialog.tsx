import type { GroupSettingsRole } from '../types'
import { ShieldPlusIcon, UserPlusIcon } from 'lucide-react'
import { MAX_GROUP_MEMBER_INVITES } from '@/features/groups/lib/groupMemberInviteBatch'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import MemberInviteBatchEditor from './MemberInviteBatchEditor'
import { useGroupMemberInviteDialog } from './useGroupMemberInviteDialog'

interface AddGroupMemberDialogProps {
  groupId: string
  roles: GroupSettingsRole[]
  triggerClassName?: string
}

export default function AddGroupMemberDialog({
  groupId,
  roles,
  triggerClassName,
}: AddGroupMemberDialogProps) {
  const {
    defaultIsAdmin,
    defaultRoleId,
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
  } = useGroupMemberInviteDialog({ groupId, roles })

  return (
    <Dialog open={open} onOpenChange={handleDialogToggle}>
      <DialogTrigger asChild>
        <Button disabled={roles.length === 0} className={triggerClassName}>
          <UserPlusIcon data-icon="inline-start" />
          Add members
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add members</DialogTitle>
          <DialogDescription>
            Prepare up to
            {' '}
            {MAX_GROUP_MEMBER_INVITES}
            {' '}
            invites from pasted text or CSV, then apply shared or per-member access before sending.
          </DialogDescription>
        </DialogHeader>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={event => void handleFileChange(event)}
        />
        <MemberInviteBatchEditor
          defaultIsAdmin={defaultIsAdmin}
          defaultRoleId={defaultRoleId}
          draftSource={draftSource}
          inviteRows={inviteRows}
          maxInvites={MAX_GROUP_MEMBER_INVITES}
          onAddBlankRow={handleAddBlankRow}
          onApplyAssignment={handleApplyAssignment}
          onDraftSourceChange={setDraftSource}
          onImportSource={() => handleImportSource(draftSource)}
          onOpenFilePicker={() => fileInputRef.current?.click()}
          onRemoveRow={handleRemoveRow}
          onSelectAllRows={checked => setSelectedRowIds(checked ? inviteRows.map(row => row.id) : [])}
          onSelectRow={toggleRowSelection}
          onUpdateDefaultAccess={setDefaultIsAdmin}
          onUpdateDefaultRole={setDefaultRoleId}
          onUpdateRow={handleUpdateRow}
          roles={roles}
          rowErrors={rowErrors}
          selectedCount={selectedRowIds.length}
          selectedRowIds={selectedRowIdSet}
        />
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={handleCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={inviteRows.length === 0 || isPending || roles.length === 0}
          >
            {isPending
              ? <Spinner text="Adding members..." />
              : (
                  <>
                    {hasAdminInvite
                      ? <ShieldPlusIcon data-icon="inline-start" />
                      : <UserPlusIcon data-icon="inline-start" />}
                    {hasAdminInvite ? 'Add members with access' : 'Add members'}
                  </>
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
