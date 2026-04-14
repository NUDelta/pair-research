import type { GroupSettingsMember, GroupSettingsRole } from '../types'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Settings2Icon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateGroupMember } from '@/features/groups/server/groups'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface EditGroupMemberDialogProps {
  creatorId: string
  currentUserId: string
  groupId: string
  member: GroupSettingsMember
  roles: GroupSettingsRole[]
}

export default function EditGroupMemberDialog({
  creatorId,
  currentUserId,
  groupId,
  member,
  roles,
}: EditGroupMemberDialogProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const updateGroupMemberFn = useServerFn(updateGroupMember)
  const [open, setOpen] = useState(false)
  const [draftRoleId, setDraftRoleId] = useState(member.roleId)
  const [draftAdminValue, setDraftAdminValue] = useState(member.isAdmin ? 'admin' : 'member')
  const [isPending, startTransition] = useTransition()

  const isDirty = draftRoleId !== member.roleId || (draftAdminValue === 'admin') !== member.isAdmin
  const trimmedFullName = member.fullName?.trim()
  const displayName = trimmedFullName !== undefined && trimmedFullName.length > 0
    ? trimmedFullName
    : member.email

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      setDraftRoleId(member.roleId)
      setDraftAdminValue(member.isAdmin ? 'admin' : 'member')
    }
  }

  const onSave = () => {
    startTransition(async () => {
      const response = await updateGroupMemberFn({
        data: {
          groupId,
          userId: member.userId,
          roleId: draftRoleId,
          isAdmin: draftAdminValue === 'admin',
        },
      })

      if (!response.success) {
        toast.error(response.message)
        return
      }

      toast.success(response.message)
      setOpen(false)

      if (response.lostManagementAccess === true && member.userId === currentUserId) {
        await navigate({ to: '/groups/$slug', params: { slug: groupId } })
        return
      }

      await router.invalidate()
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2Icon data-icon="inline-start" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage member</DialogTitle>
          <DialogDescription>
            Update the role and access for
            {' '}
            <span className="font-medium text-foreground">{displayName}</span>
            .
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`member-role-${member.userId}`}>Role</Label>
            <Select value={draftRoleId} onValueChange={setDraftRoleId}>
              <SelectTrigger id={`member-role-${member.userId}`} className="w-full">
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
          <div className="grid gap-2">
            <Label htmlFor={`member-access-${member.userId}`}>Access</Label>
            <Select
              value={draftAdminValue}
              onValueChange={setDraftAdminValue}
              disabled={member.userId === creatorId}
            >
              <SelectTrigger id={`member-access-${member.userId}`} className="w-full">
                <SelectValue placeholder="Choose access" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {member.userId === creatorId && (
              <p className="text-sm text-muted-foreground">
                The group creator must remain an admin in this initial version.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!isDirty || isPending}>
            {isPending
              ? <Spinner text="Saving..." />
              : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
