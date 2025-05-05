'use client'

import type { TaskValues } from '@/lib/validators/task'
import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { upsertTask } from '@/lib/actions/task'
import { taskSchema } from '@/lib/validators/task'
import { zodResolver } from '@hookform/resolvers/zod'
import { SquarePen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import TaskDescription from './TaskDescription'

interface TaskEditorProps {
  groupId: string
  description?: string | null
}

const TaskEditor = ({ groupId, description }: TaskEditorProps) => {
  const [currentDescription, setCurrentDescription] = useState(description ?? '')
  const [isJoined, setIsJoined] = useState(description !== undefined)
  const [editing, setEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<TaskValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      description: description ?? '',
    },
  })

  const handleTaskUpsert = async (data: TaskValues) => {
    if (data.description.trim() === '') {
      toast.error('Task description cannot be empty.')
      return
    }
    if (currentDescription === data.description.trim()) {
      toast.warning('No changes made to the task description.')
      return
    }
    startTransition(async () => {
      const { success, message } = await upsertTask(groupId, data.description.trim())
      if (success) {
        toast.success(message)
        setCurrentDescription(data.description)
        setIsJoined(true)
        router.refresh()
      }
      else {
        toast.error(message)
      }
    })
    setEditing(false)
  }

  return editing || isPending
    ? (
        <form onSubmit={handleSubmit(handleTaskUpsert)} className="space-y-3 sm:px-2">
          <Textarea
            {...register('description')}
            placeholder="Describe what you need help with..."
            aria-label="Edit your task"
          />
          {errors.description && (
            <p className="text-sm text-red-500">{errors.description.message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => {
                reset()
                setEditing(false)
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isDirty}>
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
            description={description
              ?? 'No task submitted yet. Submit a task to join the pool!'}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(true)}
            aria-label="Edit Task"
          >
            <SquarePen className="h-4 w-4" />
            {(currentDescription === null || currentDescription.trim() !== '')
              ? 'Edit'
              : 'Add Task'}
          </Button>
        </div>
      )
}

export default TaskEditor
