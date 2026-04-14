import type { GroupSettingsRole } from '../types'
import { MoreHorizontalIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
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
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        {selectedRoles.length > 0 && (
          <Badge variant="secondary">
            {selectedRoles.length}
            {' '}
            selected
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={selectedRoles.length === 0}
            >
              <MoreHorizontalIcon data-icon="inline-start" />
              Bulk actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Bulk actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setMergeOpen(true)}>
                Merge selected roles
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setRemoveOpen(true)}>
                Remove selected roles
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <CreateGroupRoleDialog groupId={groupId} triggerClassName="flex-1 sm:flex-none" />
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
      </div>
    </>
  )
}
