import type { infer as Infer } from 'zod'
import type { GroupSettingsRole } from '../types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ShieldPlusIcon, UserPlusIcon } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { addGroupMemberSchema } from '@/features/groups/schemas/groupManagement'
import { addGroupMember } from '@/features/groups/server/groups'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'

interface AddGroupMemberDialogProps {
  groupId: string
  roles: GroupSettingsRole[]
}

const inviteMemberFormSchema = addGroupMemberSchema.omit({ groupId: true })
type InviteMemberFormValues = Infer<typeof inviteMemberFormSchema>

export default function AddGroupMemberDialog({
  groupId,
  roles,
}: AddGroupMemberDialogProps) {
  const router = useRouter()
  const addGroupMemberFn = useServerFn(addGroupMember)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      roleId: roles[0]?.id ?? '',
      isAdmin: false,
    },
  })

  const {
    control,
    formState: { errors, isValid },
    handleSubmit,
    register,
    reset,
    setValue,
    watch,
  } = form
  const selectedRoleId = watch('roleId')
  const shouldInviteAsAdmin = watch('isAdmin')

  useEffect(() => {
    if (roles.length === 0) {
      return
    }

    if (!roles.some(role => role.id === selectedRoleId)) {
      setValue('roleId', roles[0].id, { shouldValidate: true })
    }
  }, [roles, selectedRoleId, setValue])

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const response = await addGroupMemberFn({
        data: {
          groupId,
          email: values.email,
          roleId: values.roleId,
          isAdmin: values.isAdmin,
        },
      })

      if (!response.success) {
        toast.error(response.message)
        return
      }

      toast.success(response.message)
      reset({
        email: '',
        roleId: roles[0]?.id ?? '',
        isAdmin: false,
      })
      setOpen(false)
      await router.invalidate()
    })
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={roles.length === 0}>
          <UserPlusIcon data-icon="inline-start" />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            Add a pending member invitation and choose the initial role and admin access.
          </DialogDescription>
        </DialogHeader>
        <form id="invite-group-member-form" onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="member@example.com"
              aria-invalid={errors.email !== undefined}
              {...register('email')}
            />
            {errors.email !== undefined && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invite-role">Role</Label>
            <Controller
              name="roleId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="invite-role" aria-invalid={errors.roleId !== undefined} className="w-full">
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
              )}
            />
            {errors.roleId !== undefined && (
              <p className="text-sm text-destructive">{errors.roleId.message}</p>
            )}
          </div>
          <div className="flex items-start gap-3 rounded-lg border p-4">
            <Controller
              name="isAdmin"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="invite-admin"
                  checked={field.value}
                  onCheckedChange={checked => field.onChange(checked === true)}
                />
              )}
            />
            <div className="flex flex-col gap-1">
              <Label htmlFor="invite-admin">Grant admin access</Label>
              <p className="text-sm text-muted-foreground">
                Admins can manage members, update settings, and control pairings.
              </p>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form="invite-group-member-form" disabled={!isValid || isPending || roles.length === 0}>
            {isPending
              ? <Spinner text="Adding member..." />
              : (
                  <>
                    {shouldInviteAsAdmin
                      ? <ShieldPlusIcon data-icon="inline-start" />
                      : <UserPlusIcon data-icon="inline-start" />}
                    Add member
                  </>
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
