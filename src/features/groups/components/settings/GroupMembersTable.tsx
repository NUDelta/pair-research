import type { ColumnDef, RowSelectionState, VisibilityState } from '@tanstack/react-table'
import type { GroupSettingsMember, GroupSettingsRole } from './types'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { SlidersHorizontalIcon, Trash2Icon, UsersIcon } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { removeGroupMember } from '@/features/groups/server/groups'
import { getInitials } from '@/shared/lib/avatar'
import { DoubleConfirmDialog, Spinner } from '@/shared/ui'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/avatar'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'
import AddGroupMemberDialog from './AddGroupMemberDialog'
import EditGroupMemberDialog from './EditGroupMemberDialog'

interface GroupMembersTableProps {
  creatorId: string
  currentUserId: string
  groupId: string
  hasActivePairing: boolean
  members: GroupSettingsMember[]
  roles: GroupSettingsRole[]
}

interface GroupMemberTableRow extends GroupSettingsMember {
  canRemove: boolean
  displayName: string
  joinedAtLabel: string
  removeDisabledReason: string | null
}

const columnLabels: Record<string, string> = {
  access: 'Access',
  displayName: 'Member',
  joinedAt: 'Joined',
  roleTitle: 'Role',
  status: 'Status',
}

export default function GroupMembersTable({
  creatorId,
  currentUserId,
  groupId,
  hasActivePairing,
  members,
  roles,
}: GroupMembersTableProps) {
  const router = useRouter()
  const removeGroupMemberFn = useServerFn(removeGroupMember)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [isBulkRemoving, startBulkRemoveTransition] = useTransition()

  const data = useMemo<GroupMemberTableRow[]>(
    () =>
      members.map((member) => {
        const trimmedFullName = member.fullName?.trim()
        const displayName = trimmedFullName !== undefined && trimmedFullName.length > 0
          ? trimmedFullName
          : member.email
        const removeDisabledReason = member.isCreator
          ? 'The group creator cannot be removed.'
          : member.userId === currentUserId
            ? 'Use a dedicated leave-group flow instead of removing yourself from settings.'
            : hasActivePairing && !member.isPending
              ? 'Reset the active pairing before removing this confirmed member.'
              : null

        return {
          ...member,
          canRemove: removeDisabledReason === null,
          displayName,
          joinedAtLabel: new Date(member.joinedAt).toLocaleDateString(),
          removeDisabledReason,
        }
      }),
    [currentUserId, hasActivePairing, members],
  )

  const columns = useMemo<ColumnDef<GroupMemberTableRow>[]>(
    () => [
      {
        id: 'select',
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all removable members"
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
            disabled={!row.getCanSelect()}
            onCheckedChange={value => row.toggleSelected(value === true)}
          />
        ),
      },
      {
        accessorKey: 'displayName',
        header: 'Member',
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-9">
              <AvatarImage
                src={row.original.avatarUrl === null ? undefined : row.original.avatarUrl}
                alt={row.original.displayName}
              />
              <AvatarFallback>{getInitials(row.original.fullName ?? row.original.email)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-medium">{row.original.displayName}</span>
              <span className="truncate text-sm text-muted-foreground">{row.original.email}</span>
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'roleTitle',
        header: 'Role',
        cell: ({ row }) => row.original.roleTitle,
      },
      {
        id: 'access',
        header: 'Access',
        accessorFn: (row: GroupMemberTableRow) => (row.isAdmin ? 'Admin' : 'Member'),
        cell: ({ row }) => (
          <Badge variant={row.original.isAdmin ? 'default' : 'secondary'}>
            {row.original.isAdmin ? 'Admin' : 'Member'}
          </Badge>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (row: GroupMemberTableRow) => row.isPending ? 'Pending' : 'Active',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            {row.original.isCreator && <Badge variant="outline">Creator</Badge>}
            <Badge variant={row.original.isPending ? 'secondary' : 'outline'}>
              {row.original.isPending ? 'Pending' : 'Active'}
            </Badge>
          </div>
        ),
      },
      {
        id: 'joinedAt',
        header: 'Joined',
        accessorFn: (row: GroupMemberTableRow) => row.joinedAtLabel,
        cell: ({ row }) => row.original.isPending ? 'Pending invite' : row.original.joinedAtLabel,
      },
      {
        id: 'actions',
        enableHiding: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end gap-2">
            <EditGroupMemberDialog
              creatorId={creatorId}
              currentUserId={currentUserId}
              groupId={groupId}
              member={row.original}
              roles={roles}
            />
            <DoubleConfirmDialog
              title={`Remove ${row.original.displayName}?`}
              description={row.original.isPending
                ? 'This will revoke the pending invitation.'
                : 'This will remove the member from the group and disable any current pool task they still have.'}
              confirmText="Remove member"
              pendingText="Removing member..."
              onConfirm={async () => {
                const response = await removeGroupMemberFn({
                  data: {
                    groupId,
                    userId: row.original.userId,
                  },
                })

                if (!response.success) {
                  toast.error(response.message)
                  return
                }

                toast.success(response.message)
                await router.invalidate()
              }}
              trigger={(
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={!row.original.canRemove}
                  title={row.original.removeDisabledReason === null ? undefined : row.original.removeDisabledReason}
                >
                  <Trash2Icon data-icon="inline-start" />
                  Remove
                </Button>
              )}
            />
          </div>
        ),
      },
    ],
    [creatorId, currentUserId, groupId, removeGroupMemberFn, roles, router],
  )

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: row => row.userId,
    enableRowSelection: row => row.original.canRemove,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      columnVisibility,
      rowSelection,
    },
  })

  const selectedMembers = table.getSelectedRowModel().rows.map(row => row.original)

  const onBulkRemove = async () => {
    startBulkRemoveTransition(async () => {
      let removedCount = 0
      const failures: string[] = []

      for (const member of selectedMembers) {
        const response = await removeGroupMemberFn({
          data: {
            groupId,
            userId: member.userId,
          },
        })

        if (response.success) {
          removedCount += 1
          continue
        }

        failures.push(`${member.displayName}: ${response.message}`)
      }

      setRowSelection({})
      await router.invalidate()

      if (removedCount > 0) {
        toast.success(`Removed ${removedCount} selected ${removedCount === 1 ? 'member' : 'members'}.`)
      }

      if (failures.length === 1) {
        toast.error(failures[0])
      }
      else if (failures.length > 1) {
        toast.error(`${failures.length} selected members could not be removed.`)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1">
          <CardTitle>Members</CardTitle>
          <CardDescription>
            Manage invitations, roles, and admin access from a single table.
          </CardDescription>
        </div>
        <CardAction className="flex flex-wrap gap-2">
          <AddGroupMemberDialog groupId={groupId} roles={roles} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontalIcon data-icon="inline-start" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {table
                  .getAllColumns()
                  .filter(column => column.getCanHide())
                  .map(column => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={value => column.toggleVisibility(value === true)}
                    >
                      {columnLabels[column.id] ?? column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {hasActivePairing && (
          <div className="rounded-lg border border-dashed p-4">
            <p className="font-medium">Active pairing in progress</p>
            <p className="text-sm text-muted-foreground">
              Confirmed members stay locked until the pool is reset. Pending invitations can still be removed.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border p-2">
              <UsersIcon className="text-muted-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {data.length}
                {' '}
                total
                {' '}
                {data.length === 1 ? 'member' : 'members'}
              </span>
              <span className="text-sm text-muted-foreground">
                {selectedMembers.length > 0
                  ? `${selectedMembers.length} removable ${selectedMembers.length === 1 ? 'member' : 'members'} selected`
                  : 'Use row selection for bulk management.'}
              </span>
            </div>
          </div>
          <DoubleConfirmDialog
            title={`Remove ${selectedMembers.length} selected ${selectedMembers.length === 1 ? 'member' : 'members'}?`}
            description="This removes the selected invitations or members using the same server-side safety rules as row-level removal."
            confirmText="Remove selected"
            pendingText="Removing members..."
            onConfirm={onBulkRemove}
            trigger={(
              <Button variant="destructive" disabled={selectedMembers.length === 0 || isBulkRemoving}>
                {isBulkRemoving
                  ? <Spinner text="Removing..." />
                  : (
                      <>
                        <Trash2Icon data-icon="inline-start" />
                        Remove selected
                      </>
                    )}
              </Button>
            )}
          />
        </div>

        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id} className={header.column.id === 'actions' ? 'text-right' : undefined}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0
              ? table.getRowModel().rows.map(row => (
                  <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                    {row.getVisibleCells().map(cell => (
                      <TableCell key={cell.id} className={cell.column.id === 'actions' ? 'text-right' : undefined}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center text-muted-foreground">
                      No members found for this group.
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
