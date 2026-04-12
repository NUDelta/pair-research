import type { FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { SquarePen } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useCurrentUserTaskDescription } from '@/hooks'
import { upsertTask } from '@/lib/actions/task'
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draftDescription, setDraftDescription] = useState(currentDescription ?? '')
  const [isPending, startTransition] = useTransition()
  const upsertTaskFn = useServerFn(upsertTask)
  const router = useRouter()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)

    startTransition(async () => {
      try {
        const state = await upsertTaskFn({
          data: {
            groupId,
            description: draftDescription,
          },
        })

        if (state?.success) {
          toast.success(state.message)
          setEditing(false)
          await router.invalidate()
        }
        else if (state?.message !== undefined) {
          toast.error(state.message)
          setErrorMessage(state.message)
        }
      }
      catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update task'
        toast.error(message)
        setErrorMessage(message)
      }
    })
  }

  return editing || isPending
    ? (
        <form onSubmit={handleSubmit} className="space-y-3 sm:px-2" aria-label="Task Editor">
          <Textarea
            value={draftDescription}
            onChange={event => setDraftDescription(event.target.value)}
            placeholder={currentDescription ?? 'Describe what you need help with...'}
            aria-label="Edit your task"
          />
          {errorMessage !== null && (
            <p className="text-sm text-red-500">{errorMessage}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                setDraftDescription(currentDescription ?? '')
                setErrorMessage(null)
                setEditing(false)
              }}
            >
              Cancel
            </Button>
            <p aria-live="polite" className="sr-only" role="status">
              {errorMessage ?? ''}
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
        </form>
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
            onClick={() => {
              setDraftDescription(currentDescription ?? '')
              setErrorMessage(null)
              setEditing(true)
            }}
            aria-label="Edit Task"
          >
            <SquarePen className="h-4 w-4" />
            {isJoined ? 'Edit' : 'Add Task'}
          </Button>
        </div>
      )
}

export default TaskEditor
