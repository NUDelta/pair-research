import type { ColumnDef } from '@tanstack/react-table'
import type { GroupSettingsRole } from '../types'
import type { GroupRoleTableRow } from './roleTableRows'
import { createColumnHelper } from '@tanstack/react-table'
import { UsersIcon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Checkbox } from '@/shared/ui/checkbox'
import { DataTableColumnHeader } from '@/shared/ui/data-table'
import DeleteGroupRoleDialog from './DeleteGroupRoleDialog'
import RoleTitleInlineEditor from './RoleTitleInlineEditor'

const columnHelper = createColumnHelper<GroupRoleTableRow>()

interface CreateRoleTableColumnsOptions {
  groupId: string
  roles: GroupSettingsRole[]
}

export function createRoleTableColumns({
  groupId,
  roles,
}: CreateRoleTableColumnsOptions) {
  return [
    columnHelper.display({
      id: 'select',
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all visible roles"
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={value => table.toggleAllPageRowsSelected(value === true)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select ${row.original.title}`}
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(value === true)}
        />
      ),
    }),
    columnHelper.accessor('title', {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => (
        <RoleTitleInlineEditor
          groupId={groupId}
          role={{ id: row.original.id, title: row.original.title }}
        />
      ),
    }),
    columnHelper.accessor('assignedMemberCount', {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Assigned members" />,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon aria-hidden="true" />
          <span>
            {row.original.assignedMemberCount}
            {' '}
            total
          </span>
          {row.original.pendingMemberCount > 0 && (
            <Badge variant="secondary">
              {row.original.pendingMemberCount}
              {' '}
              pending
            </Badge>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('activeMemberCount', {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.activeMemberCount > 0 ? 'outline' : 'secondary'}>
          {row.original.activeMemberCount > 0 ? `${row.original.activeMemberCount} active` : 'Unassigned'}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DeleteGroupRoleDialog
            assignedMemberCount={row.original.assignedMemberCount}
            groupId={groupId}
            role={{ id: row.original.id, title: row.original.title }}
            roles={roles}
          />
        </div>
      ),
    }),
  ] as ColumnDef<GroupRoleTableRow>[]
}
