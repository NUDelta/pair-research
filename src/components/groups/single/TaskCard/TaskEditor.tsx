'use client'

import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUserTaskDescription } from '@/hooks'
import { upsertTask } from '@/lib/actions/task'
import { SquarePen } from 'lucide-react'
import Form from 'next/form'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useState } from 'react'
import { toast } from 'sonner'
import TaskDescription from './TaskDescription'

interface TaskEditorProps {
  groupId: string
  currentUserId: string
  initialDescription?: string | null
}

const TaskEditor = ({ groupId, currentUserId, initialDescription }: TaskEditorProps) => {
  const [editing, setEditing] = useState(false)
  const { currentDescription } = useCurrentUserTaskDescription(groupId, currentUserId, initialDescription)
  const isJoined = currentDescription !== null && currentDescription.trim() !== ''
  const [state, formAction, isPending] = useActionState(upsertTask, undefined)

  const router = useRouter()

  useEffect(() => {
    if (state?.success) {
      toast.success(state?.message)
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setEditing(false)
      router.refresh()
    }
    else if (!state?.success && state?.message !== undefined) {
      toast.error(state?.message)
    }
  }, [state, router])

  return editing || isPending
    ? (
        <Form action={formAction} className="space-y-3 sm:px-2" aria-label="Task Editor">
          <input type="hidden" name="groupId" value={groupId} />
          <Textarea
            name="description"
            defaultValue={currentDescription ?? ''}
            placeholder={currentDescription ?? 'Describe what you need help with...'}
            aria-label="Edit your task"
          />
          {!state?.success && state?.schemaError !== undefined && (
            <p className="text-sm text-red-500">{state?.schemaError}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setEditing(false)
              }}
            >
              Cancel
            </Button>
            <p aria-live="polite" className="sr-only" role="status">
              {state?.message}
            </p>
            <Button type="submit" disabled={isPending}>
              {
                isPending
                  ? <Spinner text="Submitting..." />
                  : isJoined
                    ? 'Update'
                    : 'Join the Pool'
              }
            </Button>
          </div>
        </Form>
      )
    : (
        <div className="flex justify-between items-center">
          <TaskDescription
            description={currentDescription
              ?? 'No task submitted yet. Submit a task to join the pool!'}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            aria-label="Edit Task"
          >
            <SquarePen className="h-4 w-4" />
            {isJoined ? 'Edit' : 'Add Task'}
          </Button>
        </div>
      )
}

export default TaskEditor
