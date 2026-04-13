import type { GroupValues } from '@/features/groups/schemas/groupForm'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import * as React from 'react'
import { useTransition } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { groupSchema } from '@/features/groups/schemas/groupForm'
import { createGroup } from '@/features/groups/server/groups'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import AssignedRoleSelector from './AssignedRoleSelector'
import GroupBasicsSection from './GroupBasicsSection'
import MemberInviteList from './MemberInviteList'
import RolesEditor from './RolesEditor'

const CreateGroupForm = () => {
  const navigate = useNavigate()
  const createGroupFn = useServerFn(createGroup)
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
  } = form

  const { fields: roleFields, append: appendRole, remove: removeRole, update: updateRole }
    = useFieldArray({ name: 'roles', control })

  const { fields: memberFields, append: appendMember, remove: removeMember, update: updateMember }
    = useFieldArray({ name: 'members', control })

  const onSubmit = async (data: GroupValues) => {
    // Assigned role must be one of the roles
    if (!data.roles.some(role => role.title === data.assignedRole)) {
      toast.error(`Assigned role must be one of the roles. Current selection: ${data.assignedRole}`)
      return
    }
    // Check if all members have a role assigned among the roles
    if (!data.members.every(member => data.roles.some(role => role.title === member.title))) {
      toast.error('All members must have a role assigned among the roles')
      return
    }
    // Check email duplications
    if (data.members.length !== new Set(data.members.map(member => member.email)).size) {
      toast.error('Email duplications are not allowed')
      return
    }
    startTransition(async () => {
      const { success, message } = await createGroupFn({ data })
      if (success) {
        toast.success(message)
        await navigate({ to: '/groups' })
      }
      else {
        toast.error(message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
        updateMember={updateMember}
      />

      {/* Submit */}
      <div className="flex justify-end">
        <Button type="submit" disabled={!isValid || isPending}>
          {isPending
            ? (
                <Spinner text="Creating group..." />
              )
            : 'Create Group'}
        </Button>
      </div>
    </form>
  )
}

export default CreateGroupForm
