import type { ColumnDef } from '@tanstack/react-table'
import type { GroupSettingsRole } from '../types'
import type { GroupMemberTableRow } from './memberTableRows'
import { createColumnHelper } from '@tanstack/react-table'
import { Trash2Icon } from 'lucide-react'
import { getInitials } from '@/shared/lib/avatar'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { DataTableColumnHeader } from '@/shared/ui/data-table'
import DoubleConfirmDialog from '@/shared/ui/DoubleConfirmDialog'
import MemberAccessSelect from './MemberAccessSelect'
import MemberRoleSelect from './MemberRoleSelect'

const columnHelper = createColumnHelper<GroupMemberTableRow>()

interface CreateGroupMemberColumnsOptions {
  creatorId: string
  onAccessChange: (member: GroupMemberTableRow, nextIsAdmin: boolean) => void
  onRemove: (member: GroupMemberTableRow) => Promise<void>
  onRoleChange: (member: GroupMemberTableRow, nextRoleId: string) => void
  pendingActions: Readonly<Record<string, { access?: boolean, remove?: boolean, role?: boolean }>>
  roles: GroupSettingsRole[]
  rowState: Record<string, { isAdmin: boolean, roleId: string }>
}

export function createGroupMemberColumns({
  creatorId,
  onAccessChange,
  onRemove,
  onRoleChange,
  pendingActions,
  roles,
  rowState,
}: CreateGroupMemberColumnsOptions) {
  return [
    columnHelper.display({
      id: 'select',
      enableHiding: false,
      enableSorting: false,
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all visible members"
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
          aria-label={`Select ${row.original.displayName}`}
          checked={row.getIsSelected()}
          disabled={!row.original.canSelect}
          title={row.original.managementDisabledReason ?? undefined}
          onCheckedChange={value => row.toggleSelected(value === true)}
        />
      ),
    }),
    columnHelper.accessor('displayName', {
      header: ({ column }) => <DataTableColumnHeader column={column} title="Member" />,
      cell: ({ row }) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9">
            <AvatarImage
              src={row.original.avatarUrl === null ? undefined : row.original.avatarUrl}
              alt={row.original.displayName}
            />
            <AvatarFallback>{getInitials(row.original.fullName ?? row.original.email)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.original.displayName}</span>
            <span className="truncate text-sm text-muted-foreground">{row.original.email}</span>
          </div>
        </div>
      ),
    }),
    columnHelper.display({
      id: 'role',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
      cell: ({ row }) => {
        const state = rowState[row.original.userId] ?? {
          roleId: row.original.roleId,
          isAdmin: row.original.isAdmin,
        }
        const pendingState = pendingActions[row.original.userId] ?? {}
        const isBusy = Boolean(pendingState.role || pendingState.access || pendingState.remove)

        return (
          <MemberRoleSelect
            disabled={row.original.managementDisabledReason !== null}
            value={state.roleId}
            roles={roles}
            memberName={row.original.displayName}
            isBusy={isBusy}
            isPending={pendingState.role === true}
            onChange={value => onRoleChange(row.original, value)}
          />
        )
      },
    }),
    columnHelper.display({
      id: 'access',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Access" />,
      cell: ({ row }) => {
        const state = rowState[row.original.userId] ?? {
          roleId: row.original.roleId,
          isAdmin: row.original.isAdmin,
        }
        const pendingState = pendingActions[row.original.userId] ?? {}
        const isBusy = Boolean(pendingState.role || pendingState.access || pendingState.remove)

        return (
          <MemberAccessSelect
            isAdmin={state.isAdmin}
            disabled={row.original.userId === creatorId || row.original.managementDisabledReason !== null}
            memberName={row.original.displayName}
            isBusy={isBusy}
            isPending={pendingState.access === true}
            onChange={value => onAccessChange(row.original, value)}
          />
        )
      },
    }),
    columnHelper.display({
      id: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.isCreator
            ? <Badge variant="outline">Creator</Badge>
            : (
                <Badge variant={row.original.isPending ? 'secondary' : 'outline'}>
                  {row.original.isOptimistic === true
                    ? 'Syncing'
                    : row.original.isPending
                      ? 'Pending'
                      : 'Active'}
                </Badge>
              )}
        </div>
      ),
    }),
    columnHelper.accessor('joinedAtLabel', {
      id: 'joinedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
      cell: ({ row }) => row.original.isPending ? 'Pending invite' : row.original.joinedAtLabel,
    }),
    columnHelper.display({
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      header: () => <div className="text-right sm:text-right">Actions</div>,
      cell: ({ row }) => {
        const pendingState = pendingActions[row.original.userId] ?? {}
        const isBusy = Boolean(pendingState.role || pendingState.access || pendingState.remove)

        return (
          <div className="flex justify-end">
            <DoubleConfirmDialog
              title={`Remove ${row.original.displayName}?`}
              description={row.original.isPending
                ? 'This will revoke the pending invitation.'
                : 'This will remove the member from the group and disable any current pool task they still have.'}
              confirmText="Remove member"
              pendingText="Removing member..."
              onConfirm={async () => onRemove(row.original)}
              trigger={(
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${row.original.displayName}`}
                  disabled={!row.original.canRemove || isBusy}
                  title={row.original.removeDisabledReason ?? undefined}
                >
                  <Trash2Icon />
                </Button>
              )}
            />
          </div>
        )
      },
    }),
  ] as ColumnDef<GroupMemberTableRow>[]
}
