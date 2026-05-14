import type { FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { SquarePen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCurrentUserTaskDescription } from '@/features/groups/hooks/useCurrentUserTaskDescription'
import { upsertTask } from '@/features/groups/server/tasks'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import TaskDescription from './TaskDescription'

interface TaskEditorProps {
  groupId: string
  currentUserId: string
  initialDescription?: string | null
}

const TaskEditor = ({ groupId, currentUserId, initialDescription }: TaskEditorProps) => {
  const [editing, setEditing] = useState(false)
  const { currentDescription, setCurrentDescription } = useCurrentUserTaskDescription(groupId, currentUserId, initialDescription)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draftDescription, setDraftDescription] = useState(currentDescription ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const inFlightRef = useRef(false)
  const queuedDescriptionRef = useRef<string | undefined>(undefined)
  const savedDescriptionRef = useRef<string | null>(currentDescription ?? null)
  const upsertTaskFn = useServerFn(upsertTask)
  const router = useRouter()
  const isSaving = saveStatus === 'saving'
  const isJoined = currentDescription !== null && currentDescription.trim() !== ''

  useEffect(() => {
    if (!inFlightRef.current && queuedDescriptionRef.current === undefined) {
      savedDescriptionRef.current = currentDescription ?? null

      if (!editing) {
        setDraftDescription(currentDescription ?? '')
      }
    }
  }, [currentDescription, editing])

  const flushQueuedDescription = async () => {
    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true

    try {
      while (queuedDescriptionRef.current !== undefined) {
        const nextDescription = queuedDescriptionRef.current
        queuedDescriptionRef.current = undefined
        setSaveStatus('saving')

        const state = await upsertTaskFn({
          data: {
            groupId,
            description: nextDescription,
          },
        })

        if (state?.success) {
          savedDescriptionRef.current = nextDescription
          toast.success(state.message)
          void router.invalidate()
        }
        else {
          const message = state?.message ?? 'Failed to update task'
          setCurrentDescription(savedDescriptionRef.current)
          setDraftDescription(savedDescriptionRef.current ?? '')
          setErrorMessage(message)
          setSaveStatus('error')
          toast.error(message)
          return
        }

        if (queuedDescriptionRef.current === undefined) {
          setSaveStatus('idle')
        }
      }
    }
    catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update task'
      setCurrentDescription(savedDescriptionRef.current)
      setDraftDescription(savedDescriptionRef.current ?? '')
      setErrorMessage(message)
      setSaveStatus('error')
      toast.error(message)
    }
    finally {
      inFlightRef.current = false
      if (queuedDescriptionRef.current !== undefined) {
        void flushQueuedDescription()
      }
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    const nextDescription = draftDescription.trim()

    queuedDescriptionRef.current = nextDescription
    setDraftDescription(nextDescription)
    setCurrentDescription(nextDescription)
    setSaveStatus('saving')
    setEditing(false)
    void flushQueuedDescription()
  }

  return editing
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
            <Button type="submit">
              {isJoined ? 'Update' : 'Join the Pool'}
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
          {isSaving && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <Spinner text="Saving..." />
            </p>
          )}
          {saveStatus === 'error' && errorMessage !== null && (
            <p className="text-sm text-red-500" aria-live="polite">{errorMessage}</p>
          )}
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
