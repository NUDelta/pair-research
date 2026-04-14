import type { infer as Infer } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { PlusIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { createGroupRoleSchema } from '@/features/groups/schemas/groupManagement'
import { createGroupRole } from '@/features/groups/server/groups'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'

interface CreateGroupRoleDialogProps {
  groupId: string
  triggerClassName?: string
}

const createRoleFormSchema = createGroupRoleSchema.omit({ groupId: true })
type CreateRoleFormValues = Infer<typeof createRoleFormSchema>

export default function CreateGroupRoleDialog({
  groupId,
  triggerClassName,
}: CreateGroupRoleDialogProps) {
  const router = useRouter()
  const createGroupRoleFn = useServerFn(createGroupRole)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const form = useForm<CreateRoleFormValues>({
    resolver: zodResolver(createRoleFormSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
    },
  })

  const {
    formState: { errors, isValid },
    handleSubmit,
    register,
    reset,
  } = form

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const response = await createGroupRoleFn({
        data: {
          groupId,
          title: values.title,
        },
      })

      if (!response.success) {
        toast.error(response.message)
        return
      }

      toast.success(response.message)
      reset({ title: '' })
      setOpen(false)
      await router.invalidate()
    })
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className={triggerClassName}>
          <PlusIcon data-icon="inline-start" />
          Add role
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create role</DialogTitle>
          <DialogDescription>
            Add a reusable role that can be assigned to current or future group members.
          </DialogDescription>
        </DialogHeader>
        <form id="create-group-role-form" onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="create-role-title">Role title</Label>
            <Input
              id="create-role-title"
              aria-invalid={errors.title !== undefined}
              placeholder="Research lead"
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
          <Button type="submit" form="create-group-role-form" disabled={!isValid || isPending}>
            {isPending ? <Spinner text="Creating role..." /> : 'Create role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
