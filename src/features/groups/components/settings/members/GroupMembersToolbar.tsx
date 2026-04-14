import type { GroupSettingsRole } from '../types'
import type { GroupMemberTableRow } from './memberTableRows'
import { MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import DoubleConfirmDialog from '@/shared/ui/DoubleConfirmDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import AddGroupMemberDialog from './AddGroupMemberDialog'

interface GroupMembersToolbarProps {
  groupId: string
  hasNonRemovableSelected: boolean
  isBulkRemoving: boolean
  isBulkUpdatingRole: boolean
  onBulkRemove: () => Promise<void>
  onBulkRoleUpdate: (roleId: string) => Promise<void>
  roles: GroupSettingsRole[]
  selectedMembers: GroupMemberTableRow[]
  selectedRemovableMembers: GroupMemberTableRow[]
}

export default function GroupMembersToolbar({
  groupId,
  hasNonRemovableSelected,
  isBulkRemoving,
  isBulkUpdatingRole,
  onBulkRemove,
  onBulkRoleUpdate,
  roles,
  selectedMembers,
  selectedRemovableMembers,
}: GroupMembersToolbarProps) {
  return (
    <>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        {selectedMembers.length > 0 && (
          <Badge variant="secondary">
            {selectedMembers.length}
            {' '}
            selected
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={selectedMembers.length === 0 || isBulkUpdatingRole || isBulkRemoving}
            >
              <MoreHorizontalIcon data-icon="inline-start" />
              Bulk actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="py-2 px-3">
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger disabled={roles.length === 0}>
                  Change role
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {roles.map(role => (
                    <DropdownMenuItem
                      key={role.id}
                      onSelect={() => void onBulkRoleUpdate(role.id)}
                    >
                      {role.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DoubleConfirmDialog
                title={`Remove ${selectedRemovableMembers.length} selected ${selectedRemovableMembers.length === 1 ? 'member' : 'members'}?`}
                description={hasNonRemovableSelected
                  ? 'Only removable members will be processed. Selected creators, yourself, or confirmed members blocked by an active pairing will be skipped.'
                  : 'This will remove the selected members from the group and revoke any pending invitations in the selection.'}
                confirmText="Remove selected"
                pendingText="Removing selected..."
                onConfirm={onBulkRemove}
                trigger={(
                  <Button
                    variant="ghost"
                    className="w-full justify-start px-2"
                    disabled={selectedRemovableMembers.length === 0 || isBulkRemoving}
                    title={selectedRemovableMembers.length === 0
                      ? 'Select at least one removable member.'
                      : undefined}
                  >
                    <Trash2Icon data-icon="inline-start" />
                    Remove selected
                  </Button>
                )}
              />
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <AddGroupMemberDialog groupId={groupId} roles={roles} triggerClassName="flex-1 sm:flex-none" />
      </div>
    </>
  )
}
