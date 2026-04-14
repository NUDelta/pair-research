import type { GroupSettingsRole } from '../types'
import type { GroupMemberTableRow } from './memberTableRows'
import { useState } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import DoubleConfirmDialog from '@/shared/ui/DoubleConfirmDialog'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
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
  const [bulkRoleId, setBulkRoleId] = useState(roles[0]?.id ?? '')
  const resolvedBulkRoleId = roles.some(role => role.id === bulkRoleId) ? bulkRoleId : (roles[0]?.id ?? '')

  return (
    <>
      {selectedMembers.length > 0 && (
        <>
          <Badge variant="secondary">
            {selectedMembers.length}
            {' '}
            selected
          </Badge>
          <Select
            value={resolvedBulkRoleId}
            onValueChange={setBulkRoleId}
            disabled={isBulkUpdatingRole || roles.length === 0}
          >
            <SelectTrigger className="min-w-[180px]">
              <SelectValue placeholder="Choose a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {roles.map(role => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={() => {
              void onBulkRoleUpdate(resolvedBulkRoleId)
            }}
            disabled={resolvedBulkRoleId.length === 0 || isBulkUpdatingRole}
          >
            Apply role
          </Button>
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
                variant="outline"
                disabled={selectedRemovableMembers.length === 0 || isBulkRemoving}
                title={selectedRemovableMembers.length === 0
                  ? 'Select at least one removable member.'
                  : undefined}
              >
                Remove selected
              </Button>
            )}
          />
        </>
      )}
      <AddGroupMemberDialog groupId={groupId} roles={roles} />
    </>
  )
}
