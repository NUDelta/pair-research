import type { ApplyGroupSettingsOptimisticUpdate } from '../optimisticGroupSettings'
import type { GroupSettingsRole } from '../types'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CheckIcon, LoaderCircleIcon, PencilIcon, XIcon } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateGroupRoleSchema } from '@/features/groups/schemas/groupManagement'
import { updateGroupRole } from '@/features/groups/server/groups/updateGroupRole'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { applyRoleUpdate } from '../optimisticGroupSettings'

interface RoleTitleInlineEditorProps {
  applyOptimisticUpdate: ApplyGroupSettingsOptimisticUpdate
  groupId: string
  role: GroupSettingsRole
}

export default function RoleTitleInlineEditor({
  applyOptimisticUpdate,
  groupId,
  role,
}: RoleTitleInlineEditorProps) {
  const router = useRouter()
  const updateGroupRoleFn = useServerFn(updateGroupRole)
  const [draftTitle, setDraftTitle] = useState(role.title)
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const validation = updateGroupRoleSchema.shape.title.safeParse(draftTitle)

  const handleCancel = () => {
    setDraftTitle(role.title)
    setIsEditing(false)
  }

  const handleSave = () => {
    if (!validation.success || draftTitle.trim() === role.title.trim()) {
      setIsEditing(false)
      setDraftTitle(role.title)
      return
    }

    const rollback = applyOptimisticUpdate((draft) => {
      applyRoleUpdate(draft, {
        roleId: role.id,
        title: draftTitle,
      })
    })

    setIsEditing(false)

    startTransition(async () => {
      const response = await updateGroupRoleFn({
        data: {
          groupId,
          roleId: role.id,
          title: draftTitle,
        },
      })

      if (!response.success) {
        rollback()
        setDraftTitle(draftTitle.trim())
        setIsEditing(true)
        toast.error(response.message)
        return
      }

      toast.success(response.message)
      void router.invalidate()
    })
  }

  if (!isEditing) {
    return (
      <button
        type="button"
        className="inline-flex items-center gap-2 text-left font-medium hover:text-foreground"
        disabled={role.isOptimistic === true}
        onClick={() => {
          setDraftTitle(role.title)
          setIsEditing(true)
        }}
      >
        <span>{role.title}</span>
        <PencilIcon size={15} aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="flex min-w-55 items-center gap-2">
      <Input
        value={draftTitle}
        aria-invalid={!validation.success}
        onChange={event => setDraftTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            handleCancel()
          }

          if (event.key === 'Enter') {
            event.preventDefault()
            handleSave()
          }
        }}
        disabled={isPending}
        autoFocus
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSave}
        disabled={!validation.success || draftTitle.trim() === role.title.trim() || isPending}
        aria-label={`Save ${role.title}`}
      >
        {isPending ? <LoaderCircleIcon className="animate-spin" /> : <CheckIcon />}
      </Button>
      <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isPending} aria-label={`Cancel editing ${role.title}`}>
        <XIcon />
      </Button>
    </div>
  )
}
