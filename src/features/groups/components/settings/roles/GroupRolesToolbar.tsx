import type { GroupSettingsRole } from '../types'
import { useState } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import BulkRoleActionDialog from './BulkRoleActionDialog'
import CreateGroupRoleDialog from './CreateGroupRoleDialog'

interface GroupRolesToolbarProps {
  groupId: string
  roles: GroupSettingsRole[]
  selectedRoles: GroupSettingsRole[]
}

export default function GroupRolesToolbar({
  groupId,
  roles,
  selectedRoles,
}: GroupRolesToolbarProps) {
  const [mergeOpen, setMergeOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)

  return (
    <>
      {selectedRoles.length > 0 && (
        <>
          <Badge variant="secondary">
            {selectedRoles.length}
            {' '}
            selected
          </Badge>
          <Button variant="outline" onClick={() => setMergeOpen(true)}>
            Merge selected
          </Button>
          <Button variant="outline" onClick={() => setRemoveOpen(true)}>
            Remove selected
          </Button>
          <BulkRoleActionDialog
            action="merge"
            groupId={groupId}
            onOpenChange={setMergeOpen}
            open={mergeOpen}
            roles={roles}
            selectedRoles={selectedRoles}
          />
          <BulkRoleActionDialog
            action="remove"
            groupId={groupId}
            onOpenChange={setRemoveOpen}
            open={removeOpen}
            roles={roles}
            selectedRoles={selectedRoles}
          />
        </>
      )}
      <CreateGroupRoleDialog groupId={groupId} />
    </>
  )
}
