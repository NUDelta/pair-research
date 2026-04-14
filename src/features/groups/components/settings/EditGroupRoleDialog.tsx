import type { infer as Infer } from 'zod'
import type { GroupSettingsRole } from './types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { PencilIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { updateGroupRoleSchema } from '@/features/groups/schemas/groupManagement'
import { updateGroupRole } from '@/features/groups/server/groups'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

interface EditGroupRoleDialogProps {
  groupId: string
  role: GroupSettingsRole
}

const updateRoleFormSchema = updateGroupRoleSchema.omit({ groupId: true, roleId: true })
type UpdateRoleFormValues = Infer<typeof updateRoleFormSchema>

export default function EditGroupRoleDialog({
  groupId,
  role,
}: EditGroupRoleDialogProps) {
  const router = useRouter()
  const updateGroupRoleFn = useServerFn(updateGroupRole)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const form = useForm<UpdateRoleFormValues>({
    resolver: zodResolver(updateRoleFormSchema),
    mode: 'onChange',
    defaultValues: {
      title: role.title,
    },
  })

  const {
    formState: { errors, isDirty, isValid },
    handleSubmit,
    register,
    reset,
  } = form

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)

    if (!nextOpen) {
      reset({ title: role.title })
    }
  }

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const response = await updateGroupRoleFn({
        data: {
          groupId,
          roleId: role.id,
          title: values.title,
        },
      })

      if (!response.success) {
        toast.error(response.message)
        return
      }

      toast.success(response.message)
      setOpen(false)
      await router.invalidate()
    })
  })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PencilIcon data-icon="inline-start" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit role</DialogTitle>
          <DialogDescription>
            Update the name used for this group role.
          </DialogDescription>
        </DialogHeader>
        <form id={`edit-group-role-${role.id}`} onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`edit-role-title-${role.id}`}>Role title</Label>
            <Input
              id={`edit-role-title-${role.id}`}
              aria-invalid={errors.title !== undefined}
              {...register('title')}
            />
            {errors.title !== undefined && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" form={`edit-group-role-${role.id}`} disabled={!isDirty || !isValid || isPending}>
            {isPending ? <Spinner text="Saving role..." /> : 'Save role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
