import type { GroupSettingsRole } from '../types'
import { ShieldPlusIcon, UserPlusIcon } from 'lucide-react'
import { MAX_GROUP_MEMBER_INVITES } from '@/features/groups/lib/groupMemberInviteBatch'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import MemberInviteBatchEditor from './MemberInviteBatchEditor'
import { useGroupMemberInviteDialog } from './useGroupMemberInviteDialog'

interface AddGroupMemberDialogProps {
  existingMemberEmails?: string[]
  groupId: string
  roles: GroupSettingsRole[]
  triggerClassName?: string
}

export default function AddGroupMemberDialog({
  existingMemberEmails = [],
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
  } = useGroupMemberInviteDialog({ existingMemberEmails, groupId, roles })

  return (
    <Dialog open={open} onOpenChange={handleDialogToggle}>
      <DialogTrigger asChild>
        <Button disabled={roles.length === 0} className={triggerClassName}>
          <UserPlusIcon data-icon="inline-start" />
          Add members
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-4xl">
        <div className="flex min-h-0 flex-1 flex-col p-6">
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
          <div
            data-testid="add-members-dialog-scroll-region"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1"
          >
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
          </div>
          <DialogFooter className="border-t pt-4">
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
