import type { infer as Infer } from 'zod'
import type { GroupSettingsData } from './types'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { SaveIcon } from 'lucide-react'
import { useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { updateGroupBasicsSchema } from '@/features/groups/schemas/groupManagement'
import { updateGroupBasics } from '@/features/groups/server/groups'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'

interface GroupBasicsFormCardProps {
  group: GroupSettingsData['group']
}

const groupBasicsFormSchema = updateGroupBasicsSchema.omit({ groupId: true })
type GroupBasicsFormValues = Infer<typeof groupBasicsFormSchema>

export default function GroupBasicsFormCard({ group }: GroupBasicsFormCardProps) {
  const router = useRouter()
  const updateGroupBasicsFn = useServerFn(updateGroupBasics)
  const [isPending, startTransition] = useTransition()
  const form = useForm<GroupBasicsFormValues>({
    resolver: zodResolver(groupBasicsFormSchema),
    mode: 'onChange',
    defaultValues: {
      groupName: group.name,
      groupDescription: group.description ?? '',
    },
  })

  const {
    formState: { errors, isDirty, isValid },
    handleSubmit,
    register,
    reset,
  } = form

  useEffect(() => {
    reset({
      groupName: group.name,
      groupDescription: group.description ?? '',
    })
  }, [group.description, group.name, reset])

  const onSubmit = handleSubmit((values) => {
    startTransition(async () => {
      const response = await updateGroupBasicsFn({
        data: {
          groupId: group.id,
          groupName: values.groupName,
          groupDescription: values.groupDescription,
        },
      })

      if (!response.success) {
        toast.error(response.message)
        return
      }

      toast.success(response.message)
      await router.invalidate()
    })
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic information</CardTitle>
        <CardDescription>
          Update the group name and description shown across the app.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form id="group-basics-form" onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="groupName">Group name</Label>
            <Input
              id="groupName"
              aria-invalid={errors.groupName !== undefined}
              {...register('groupName')}
            />
            {errors.groupName !== undefined && (
              <p className="text-sm text-destructive">{errors.groupName.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="groupDescription">Description</Label>
            <Textarea
              id="groupDescription"
              rows={5}
              aria-invalid={errors.groupDescription !== undefined}
              {...register('groupDescription')}
            />
            <p className="text-sm text-muted-foreground">
              Optional, but helpful for giving members shared context.
            </p>
            {errors.groupDescription !== undefined && (
              <p className="text-sm text-destructive">{errors.groupDescription.message}</p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-end">
        <Button type="submit" form="group-basics-form" disabled={!isDirty || !isValid || isPending}>
          {isPending
            ? <Spinner text="Saving..." />
            : (
                <>
                  <SaveIcon data-icon="inline-start" />
                  Save changes
                </>
              )}
        </Button>
      </CardFooter>
    </Card>
  )
}
