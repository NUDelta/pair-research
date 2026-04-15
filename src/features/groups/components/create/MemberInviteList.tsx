import type { ColumnDef } from '@tanstack/react-table'
import type { Control } from 'react-hook-form'
import type { GroupValues, MemberValues, RoleValues } from '@/features/groups/schemas/groupForm'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { toast } from 'sonner'
import { emailSchema } from '@/features/groups/schemas/groupForm'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { DataTable, DataTableColumnHeader } from '@/shared/ui/data-table'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { Textarea } from '@/shared/ui/textarea'

interface RoleField extends RoleValues {
  id: string
}

interface MemberField extends MemberValues {
  id: string
}

interface InviteTableRow extends MemberField {
  index: number
}

interface MemberInviteListProps {
  control: Control<GroupValues>
  roleFields: RoleField[]
  memberFields: MemberField[]
  appendMember: (member: MemberValues) => void
  removeMember: (index: number) => void
}

const MAX_CREATE_GROUP_MEMBERS = 50
const columnHelper = createColumnHelper<InviteTableRow>()

const EMAIL_SPLIT_REGEX = /[\n,]+/

const MemberInviteList = ({
  control,
  roleFields,
  memberFields,
  appendMember,
  removeMember,
}: MemberInviteListProps) => {
  const [draftSource, setDraftSource] = useState('')
  const hasRows = memberFields.length > 0
  const canAddMoreRows = memberFields.length < MAX_CREATE_GROUP_MEMBERS
  const defaultRoleTitle = roleFields[0]?.title ?? ''
  const rows = useMemo(
    () => memberFields.map((field, index) => ({ ...field, index })),
    [memberFields],
  )

  const handleImportSource = () => {
    const preparedEmails = draftSource
      .split(EMAIL_SPLIT_REGEX)
      .map(value => value.trim().toLowerCase())
      .filter(value => value.length > 0)

    if (preparedEmails.length === 0) {
      toast.error('Paste at least one email address to import.')
      return
    }

    const existingEmails = new Set(
      memberFields
        .map(member => member.email.trim().toLowerCase())
        .filter(email => email.length > 0),
    )
    let addedCount = 0
    let duplicateCount = 0
    let invalidCount = 0
    let truncatedCount = 0

    for (const email of preparedEmails) {
      if (memberFields.length + addedCount >= MAX_CREATE_GROUP_MEMBERS) {
        truncatedCount += 1
        continue
      }

      if (existingEmails.has(email)) {
        duplicateCount += 1
        continue
      }

      if (!emailSchema.safeParse({ email }).success) {
        invalidCount += 1
        continue
      }

      appendMember({
        email,
        title: defaultRoleTitle,
      })
      existingEmails.add(email)
      addedCount += 1
    }

    if (addedCount === 0) {
      toast.error('No new invites were added. Check for duplicates or invalid email addresses.')
      return
    }

    const summary = [
      duplicateCount > 0 ? `${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'} skipped` : null,
      invalidCount > 0 ? `${invalidCount} invalid email${invalidCount === 1 ? '' : 's'} skipped` : null,
      truncatedCount > 0 ? `${truncatedCount} skipped after reaching the limit` : null,
    ]
      .filter(part => part !== null)
      .join(', ')

    toast.success(
      summary === ''
        ? `Added ${addedCount} ${addedCount === 1 ? 'invite' : 'invites'}.`
        : `Added ${addedCount} ${addedCount === 1 ? 'invite' : 'invites'}; ${summary}.`,
    )
    setDraftSource('')
  }

  const columns = useMemo(() => {
    return [
      columnHelper.accessor('email', {
        header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
        cell: ({ row }) => (
          <Controller
            name={`members.${row.original.index}.email`}
            control={control}
            render={({ field: controlledField, fieldState }) => (
              <div className="grid min-w-60 gap-2">
                <Input
                  {...controlledField}
                  type="email"
                  aria-invalid={fieldState.error !== undefined}
                  placeholder="member@example.com"
                />
                {fieldState.error && (
                  <p className="text-sm text-destructive">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
        ),
      }),
      columnHelper.accessor('title', {
        header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
        cell: ({ row }) => (
          <Controller
            name={`members.${row.original.index}.title`}
            control={control}
            render={({ field: controlledField }) => (
              <Select
                value={controlledField.value}
                onValueChange={controlledField.onChange}
              >
                <SelectTrigger className="min-w-45">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {roleFields.map(role => (
                    <SelectItem key={role.id} value={role.title}>
                      {role.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
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
              onClick={() => removeMember(row.original.index)}
              aria-label={`Remove member ${row.original.index + 1}`}
            >
              <Trash2Icon />
            </Button>
          </div>
        ),
      }),
    ] as ColumnDef<InviteTableRow>[]
  }, [control, removeMember, roleFields])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Invite collaborators now, or leave this empty and add members later from settings.
          Existing users are notified in-app and new users receive an email invitation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Label htmlFor="member-invite-source">Paste emails</Label>
              <p className="text-sm text-muted-foreground">
                Add up to
                {' '}
                {MAX_CREATE_GROUP_MEMBERS}
                {' '}
                members at once. Use commas or new lines to separate each address.
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              {memberFields.length}
              /
              {MAX_CREATE_GROUP_MEMBERS}
              {' '}
              prepared
            </p>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <Textarea
              id="member-invite-source"
              value={draftSource}
              onChange={event => setDraftSource(event.target.value)}
              placeholder={'member1@example.com\nmember2@example.com'}
              className="min-h-28"
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={handleImportSource}
                className="flex-1 sm:flex-none"
                disabled={!canAddMoreRows}
              >
                Import list
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => appendMember({ email: '', title: defaultRoleTitle })}
                className="flex-1 sm:flex-none"
                disabled={!canAddMoreRows}
              >
                <Plus data-icon="inline-start" />
                Add blank row
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 mb-3">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">Prepared invites</h3>
              <p className="text-sm text-muted-foreground">
                Review each row before creating the group.
              </p>
            </div>
          </div>
          {hasRows
            ? (
                <DataTable
                  columns={columns}
                  data={rows}
                  emptyMessage="No invites prepared yet."
                  filterColumnId="email"
                  filterPlaceholder="Filter invites..."
                  getRowId={row => row.id}
                />
              )
            : (
                <div className="flex flex-col gap-1 px-4 py-8 text-center text-sm text-muted-foreground">
                  <p>No invites prepared yet.</p>
                  <p>Import a list or add a blank row to start.</p>
                </div>
              )}
        </div>
      </CardContent>
    </Card>
  )
}

export default MemberInviteList
