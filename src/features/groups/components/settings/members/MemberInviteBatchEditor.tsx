import type { GroupSettingsRole } from '../types'
import type { GroupMemberInviteDraft } from '@/features/groups/lib/groupMemberInviteBatch'
import { PlusIcon, Trash2Icon, UploadIcon } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

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

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border bg-muted/30 p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Label htmlFor="member-invite-source">Paste emails or CSV</Label>
            <p className="text-sm text-muted-foreground">
              Add up to
              {' '}
              {maxInvites}
              {' '}
              members at once. CSV supports `email`, `role`, and `access/admin` columns.
            </p>
          </div>
          <Badge variant="secondary">
            {inviteRows.length}
            /
            {maxInvites}
            {' '}
            prepared
          </Badge>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <Textarea
            id="member-invite-source"
            value={draftSource}
            onChange={event => onDraftSourceChange(event.target.value)}
            placeholder={'member1@example.com\nmember2@example.com,Researcher,admin'}
            className="min-h-28"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
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
          </div>
        </div>
      </div>

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

      <div className="rounded-xl border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Prepared invites</h3>
            <p className="text-sm text-muted-foreground">
              Edit rows individually before sending invitations.
            </p>
          </div>
          {hasRows && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={allRowsSelected}
                onCheckedChange={checked => onSelectAllRows(checked === true)}
              />
              Select all
            </label>
          )}
        </div>
        {hasRows
          ? (
              <div className="flex max-h-[320px] flex-col gap-3 overflow-y-auto p-4">
                {inviteRows.map((row, index) => {
                  const errors = rowErrors[row.id]

                  return (
                    <div key={row.id} className="rounded-xl border bg-background p-3">
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-3 text-sm font-medium">
                          <Checkbox
                            checked={selectedRowIds.has(row.id)}
                            onCheckedChange={checked => onSelectRow(row.id, checked === true)}
                          />
                          Invite
                          {' '}
                          {index + 1}
                        </label>
                        <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveRow(row.id)}>
                          <Trash2Icon />
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_auto]">
                        <div className="grid gap-2">
                          <Label htmlFor={`invite-email-${row.id}`}>Email</Label>
                          <Input
                            id={`invite-email-${row.id}`}
                            type="email"
                            value={row.email}
                            aria-invalid={errors?.email !== undefined}
                            onChange={event => onUpdateRow(row.id, { ...row, email: event.target.value })}
                            placeholder="member@example.com"
                          />
                          {errors?.email !== undefined && (
                            <p className="text-sm text-destructive">{errors.email}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`invite-role-${row.id}`}>Role</Label>
                          <Select
                            value={row.roleId}
                            onValueChange={roleId => onUpdateRow(row.id, { ...row, roleId })}
                          >
                            <SelectTrigger id={`invite-role-${row.id}`} aria-invalid={errors?.roleId !== undefined}>
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
                        <label className="flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm lg:self-end">
                          <Checkbox
                            checked={row.isAdmin}
                            onCheckedChange={checked => onUpdateRow(row.id, { ...row, isAdmin: checked === true })}
                          />
                          Admin access
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          : (
              <div className="flex flex-col gap-1 px-4 py-8 text-center text-sm text-muted-foreground">
                <p>No invites prepared yet.</p>
                <p>Import a list, upload a CSV, or add a blank row to start.</p>
              </div>
            )}
      </div>
    </div>
  )
}
