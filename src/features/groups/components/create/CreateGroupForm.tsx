import type { GroupValues } from '@/features/groups/schemas/groupForm'
import type { TurnstileFieldHandle } from '@/shared/turnstile/TurnstileField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CheckCircle2Icon } from 'lucide-react'
import { useRef, useTransition } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { groupSchema } from '@/features/groups/schemas/groupForm'
import { createGroup } from '@/features/groups/server/groups'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import TurnstileField from '@/shared/turnstile/TurnstileField'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import AssignedRoleSelector from './AssignedRoleSelector'
import GroupBasicsSection from './GroupBasicsSection'
import MemberInviteList from './MemberInviteList'
import RolesEditor from './RolesEditor'

const CreateGroupForm = () => {
  const navigate = useNavigate()
  const createGroupFn = useServerFn(createGroup)
  const turnstileRef = useRef<TurnstileFieldHandle>(null)
  const [isPending, startTransition] = useTransition()
  const form = useForm<GroupValues>({
    resolver: zodResolver(groupSchema),
    mode: 'onChange',
    defaultValues: {
      groupName: '',
      groupDescription: '',
      roles: [
        { title: 'Professor' },
        { title: 'Post Doc' },
        { title: 'PhD Student' },
        { title: 'Master Student' },
        { title: 'Undergraduate Student' },
      ],
      assignedRole: 'Professor',
      members: [],
    },
  })

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isValid },
    clearErrors,
    setError,
  } = form

  const { fields: roleFields, append: appendRole, remove: removeRole, update: updateRole }
    = useFieldArray({ name: 'roles', control })

  const { fields: memberFields, append: appendMember, remove: removeMember }
    = useFieldArray({ name: 'members', control })

  const onSubmit = async (data: GroupValues) => {
    clearErrors('root')
    const normalizedEmails = data.members
      .map(member => member.email.trim().toLowerCase())
      .filter(email => email.length > 0)

    if (!data.roles.some(role => role.title === data.assignedRole)) {
      const message = `Assigned role must be one of the roles. Current selection: ${data.assignedRole}`
      toast.error(message)
      setError('root', { message })
      return
    }

    if (!data.members.every(member => data.roles.some(role => role.title === member.title))) {
      const message = 'Each invited member needs one of the roles listed above.'
      toast.error(message)
      setError('root', { message })
      return
    }

    if (normalizedEmails.length !== new Set(normalizedEmails).size) {
      const message = 'Each email address can only be invited once.'
      toast.error(message)
      setError('root', { message })
      return
    }

    const turnstileToken = await turnstileRef.current?.ensureToken()
    if (turnstileToken == null || turnstileToken === '') {
      setError('root', { message: 'Please complete the security check to continue.' })
      return
    }

    startTransition(async () => {
      const result = await createGroupFn({
        data: {
          ...data,
          turnstileToken,
        },
      })

      if (result.success) {
        toast.success(result.message)
        await navigate({ to: '/groups' })
        return
      }

      turnstileRef.current?.reset()
      if (result.code === TURNSTILE_ERROR_CODES.failed || result.code === TURNSTILE_ERROR_CODES.required) {
        turnstileRef.current?.requireInteractiveChallenge(result.message)
      }

      toast.error(result.message)
      setError('root', { message: result.message })
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto flex md:w-4xl max-w-5xl flex-col gap-6">
      <GroupBasicsSection
        register={register}
        groupNameError={errors.groupName}
        groupDescriptionError={errors.groupDescription}
      />

      <RolesEditor
        control={control}
        roleFields={roleFields}
        appendRole={appendRole}
        removeRole={removeRole}
        updateRole={updateRole}
      />

      <AssignedRoleSelector
        control={control}
        roleFields={roleFields}
      />

      <MemberInviteList
        control={control}
        roleFields={roleFields}
        memberFields={memberFields}
        appendMember={appendMember}
        removeMember={removeMember}
      />

      <Card>
        <CardHeader>
          <CardTitle>Review and create</CardTitle>
          <CardDescription>
            Create the group once the basics, roles, and invites look right.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TurnstileField
            controllerRef={turnstileRef}
            action="create-group"
            mode="adaptive"
            description="Complete the security check before creating the group."
          />

          {errors.root && (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              {errors.root.message}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4" />
            You can invite more members later.
          </div>
          <Button type="submit" disabled={!isValid || isPending}>
            {isPending
              ? <Spinner text="Creating group..." />
              : 'Create group'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}

export default CreateGroupForm
