import type { ColumnDef } from '@tanstack/react-table'
import type { Control } from 'react-hook-form'
import type { GroupValues, MemberValues, RoleValues } from '@/features/groups/schemas/groupForm'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, Trash2Icon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Controller } from 'react-hook-form'
import { toast } from 'sonner'
import InvitePreparationPanel from '@/features/groups/components/invites/InvitePreparationPanel'
import PreparedInvitesTable from '@/features/groups/components/invites/PreparedInvitesTable'
import { emailSchema } from '@/features/groups/schemas/groupForm'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { DataTableColumnHeader } from '@/shared/ui/data-table'
import { Input } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

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
        <InvitePreparationPanel
          actionButtons={(
            <>
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
            </>
          )}
          count={memberFields.length}
          description={(
            <>
              Add up to
              {' '}
              {MAX_CREATE_GROUP_MEMBERS}
              {' '}
              members at once. Use commas or new lines to separate each address.
            </>
          )}
          label="Paste emails"
          maxInvites={MAX_CREATE_GROUP_MEMBERS}
          onSourceChange={setDraftSource}
          placeholder={'member1@example.com\nmember2@example.com'}
          sourceId="member-invite-source"
          sourceValue={draftSource}
        />

        <PreparedInvitesTable
          columns={columns}
          data={rows}
          description="Review each row before creating the group."
          emptyDescription="Import a list or add a blank row to start."
          emptyTitle="No invites prepared yet."
          filterColumnId="email"
          filterPlaceholder="Filter invites..."
          getRowId={row => row.id}
        />
      </CardContent>
    </Card>
  )
}

export default MemberInviteList
