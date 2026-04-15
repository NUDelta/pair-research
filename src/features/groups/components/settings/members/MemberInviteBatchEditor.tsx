import type { ColumnDef } from '@tanstack/react-table'
import type { GroupSettingsRole } from '../types'
import type { GroupMemberInviteDraft } from '@/features/groups/lib/groupMemberInviteBatch'
import { createColumnHelper } from '@tanstack/react-table'
import { PlusIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { useMemo } from 'react'
import InvitePreparationPanel from '@/features/groups/components/invites/InvitePreparationPanel'
import PreparedInvitesTable from '@/features/groups/components/invites/PreparedInvitesTable'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { DataTableColumnHeader } from '@/shared/ui/data-table'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface MemberInviteBatchEditorProps {
  defaultIsAdmin: boolean
  defaultRoleId: string
  draftSource: string
  inviteRows: InviteRow[]
  maxInvites: number
  onAddBlankRow: () => void
  onApplyAssignment: () => void
  onDraftSourceChange: (value: string) => void
  onImportSource: () => void
  onOpenFilePicker: () => void
  onRemoveRow: (rowId: string) => void
  onSelectAllRows: (checked: boolean) => void
  onSelectRow: (rowId: string, checked: boolean) => void
  onUpdateDefaultAccess: (value: boolean) => void
  onUpdateDefaultRole: (roleId: string) => void
  onUpdateRow: (rowId: string, nextRow: GroupMemberInviteDraft) => void
  roles: GroupSettingsRole[]
  rowErrors: Record<string, Partial<Record<'email' | 'roleId', string>>>
  selectedCount: number
  selectedRowIds: Set<string>
}

export interface InviteRow extends GroupMemberInviteDraft {
  id: string
}

const columnHelper = createColumnHelper<InviteRow>()

function toInviteDraft(row: InviteRow): GroupMemberInviteDraft {
  return {
    email: row.email,
    roleId: row.roleId,
    isAdmin: row.isAdmin,
  }
}

export default function MemberInviteBatchEditor({
  defaultIsAdmin,
  defaultRoleId,
  draftSource,
  inviteRows,
  maxInvites,
  onAddBlankRow,
  onApplyAssignment,
  onDraftSourceChange,
  onImportSource,
  onOpenFilePicker,
  onRemoveRow,
  onSelectAllRows,
  onSelectRow,
  onUpdateDefaultAccess,
  onUpdateDefaultRole,
  onUpdateRow,
  roles,
  rowErrors,
  selectedCount,
  selectedRowIds,
}: MemberInviteBatchEditorProps) {
  const allRowsSelected = inviteRows.length > 0 && selectedCount === inviteRows.length
  const hasRows = inviteRows.length > 0
  const canAddMoreRows = inviteRows.length < maxInvites
  const columns = useMemo(() => {
    return [
      columnHelper.display({
        id: 'select',
        enableHiding: false,
        enableSorting: false,
        header: () => (
          <div className="flex justify-center">
            <Checkbox
              aria-label="Select all invites"
              checked={allRowsSelected}
              onCheckedChange={checked => onSelectAllRows(checked === true)}
              disabled={!hasRows}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex justify-center">
            <Checkbox
              aria-label={`Select invite ${row.index + 1}`}
              checked={selectedRowIds.has(row.original.id)}
              onCheckedChange={checked => onSelectRow(row.original.id, checked === true)}
            />
          </div>
        ),
      }),
      columnHelper.accessor('email', {
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => {
          const errors = rowErrors[row.original.id]

          return (
            <div className="grid min-w-60 gap-2">
              <Input
                id={`invite-email-${row.original.id}`}
                type="email"
                value={row.original.email}
                aria-invalid={errors?.email !== undefined}
                onChange={event => onUpdateRow(row.original.id, { ...toInviteDraft(row.original), email: event.target.value })}
                placeholder="member@example.com"
              />
              {errors?.email !== undefined && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('roleId', {
        header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
        cell: ({ row }) => {
          const errors = rowErrors[row.original.id]

          return (
            <div className="grid min-w-48 gap-2">
              <Select
                value={row.original.roleId}
                onValueChange={roleId => onUpdateRow(row.original.id, { ...toInviteDraft(row.original), roleId })}
              >
                <SelectTrigger id={`invite-role-${row.original.id}`} aria-invalid={errors?.roleId !== undefined}>
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
              {errors?.roleId !== undefined && (
                <p className="text-sm text-destructive">{errors.roleId}</p>
              )}
            </div>
          )
        },
      }),
      columnHelper.accessor('isAdmin', {
        header: ({ column }) => <DataTableColumnHeader column={column} title="Access" />,
        cell: ({ row }) => (
          <label className="flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm">
            <Checkbox
              checked={row.original.isAdmin}
              onCheckedChange={checked => onUpdateRow(row.original.id, { ...toInviteDraft(row.original), isAdmin: checked === true })}
            />
            Admin access
          </label>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        enableHiding: false,
        enableSorting: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveRow(row.original.id)}
              aria-label={`Remove invite ${row.index + 1}`}
            >
              <Trash2Icon />
            </Button>
          </div>
        ),
      }),
    ] as ColumnDef<InviteRow>[]
  }, [allRowsSelected, hasRows, onRemoveRow, onSelectAllRows, onSelectRow, onUpdateRow, roles, rowErrors, selectedRowIds])

  return (
    <div className="flex flex-col gap-4">
      <InvitePreparationPanel
        actionButtons={(
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onImportSource}
              className="flex-1 sm:flex-none"
              disabled={!canAddMoreRows}
            >
              Import list
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onOpenFilePicker}
              className="flex-1 sm:flex-none"
              disabled={!canAddMoreRows}
            >
              <UploadIcon data-icon="inline-start" />
              Upload CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onAddBlankRow}
              className="flex-1 sm:flex-none"
              disabled={!canAddMoreRows}
            >
              <PlusIcon data-icon="inline-start" />
              Add blank row
            </Button>
          </>
        )}
        count={inviteRows.length}
        description={(
          <>
            Add up to
            {' '}
            {maxInvites}
            {' '}
            members at once. CSV supports `email`, `role`, and `access/admin` columns.
          </>
        )}
        label="Paste emails or CSV"
        maxInvites={maxInvites}
        onSourceChange={onDraftSourceChange}
        placeholder={'member1@example.com\nmember2@example.com,Researcher,admin'}
        sourceId="member-invite-source"
        sourceValue={draftSource}
      />

      <div className="rounded-xl border p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="member-default-role">Shared role</Label>
              <Select value={defaultRoleId} onValueChange={onUpdateDefaultRole}>
                <SelectTrigger id="member-default-role" className="w-full min-w-[180px]">
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
            </div>
            <label className="flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm">
              <Checkbox
                checked={defaultIsAdmin}
                onCheckedChange={checked => onUpdateDefaultAccess(checked === true)}
              />
              Shared admin access
            </label>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {selectedCount > 0 && (
              <Badge variant="secondary">
                {selectedCount}
                {' '}
                selected
              </Badge>
            )}
            <Button type="button" variant="outline" onClick={onApplyAssignment} disabled={!hasRows}>
              Apply to
              {' '}
              {selectedCount > 0 ? 'selected' : 'all'}
            </Button>
          </div>
        </div>
      </div>

      <PreparedInvitesTable
        columns={columns}
        data={inviteRows}
        description="Edit rows individually before sending invitations."
        emptyDescription="Import a list, upload a CSV, or add a blank row to start."
        emptyTitle="No invites prepared yet."
        filterColumnId="email"
        filterPlaceholder="Filter invites..."
        getRowId={row => row.id}
      />
    </div>
  )
}
