import type { FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { SquarePen } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useCurrentUserTaskDescription } from '@/features/groups/hooks/useCurrentUserTaskDescription'
import { upsertTask } from '@/features/groups/server/tasks'
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
  const displayDescription = currentDescription?.trim() === '' ? null : currentDescription
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [draftDescription, setDraftDescription] = useState(displayDescription ?? '')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const inFlightRef = useRef(false)
  const savedDescriptionRef = useRef<string | null>(displayDescription)
  const upsertTaskFn = useServerFn(upsertTask)
  const router = useRouter()
  const isSaving = saveStatus === 'saving'
  const isJoined = displayDescription !== null

  useEffect(() => {
    if (!inFlightRef.current) {
      savedDescriptionRef.current = displayDescription

      if (!editing) {
        setDraftDescription(displayDescription ?? '')
      }
    }
  }, [displayDescription, editing])

  const saveDescription = async (nextDescription: string) => {
    if (inFlightRef.current) {
      return
    }

    inFlightRef.current = true

    try {
      setSaveStatus('saving')

      const state = await upsertTaskFn({
        data: {
          groupId,
          description: nextDescription,
        },
      })

      if (state?.success) {
        savedDescriptionRef.current = nextDescription
        setSaveStatus('idle')
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
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (inFlightRef.current) {
      return
    }

    setErrorMessage(null)
    const nextDescription = draftDescription.trim()

    if (nextDescription === '') {
      setDraftDescription('')
      setErrorMessage('Task description is required')
      setSaveStatus('error')
      return
    }

    setDraftDescription(nextDescription)
    setCurrentDescription(nextDescription)
    setSaveStatus('saving')
    setEditing(false)
    void saveDescription(nextDescription)
  }

  return editing
    ? (
        <form onSubmit={handleSubmit} className="space-y-3 sm:px-2" aria-label="Task Editor">
          <Textarea
            value={draftDescription}
            onChange={event => setDraftDescription(event.target.value)}
            placeholder={displayDescription ?? 'Describe what you need help with...'}
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
                setDraftDescription(displayDescription ?? '')
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
            description={displayDescription
              ?? 'No task submitted yet. Submit a task to join the pool!'}
          />
          {saveStatus === 'error' && errorMessage !== null && (
            <p className="text-sm text-red-500" aria-live="polite">{errorMessage}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDraftDescription(displayDescription ?? '')
              setErrorMessage(null)
              setEditing(true)
            }}
            aria-label="Edit Task"
            disabled={isSaving}
          >
            <SquarePen className="h-4 w-4" />
            {isJoined ? 'Edit' : 'Add Task'}
          </Button>
        </div>
      )
}

export default TaskEditor
