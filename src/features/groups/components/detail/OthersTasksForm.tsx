import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useTransition } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { upsertHelpCapacities } from '@/features/groups/server/tasks'
import { Spinner } from '@/shared/ui'
import { Button } from '@/shared/ui/button'
import TaskCard from './TaskCard'

interface CapacitiesFormValues {
  capacities: Record<string, number | undefined>
}

interface OthersTasksFormProps {
  groupId: string
  tasks: Task[]
}

const OthersTasksForm = ({
  groupId,
  tasks,
}: OthersTasksFormProps) => {
  const router = useRouter()
  const upsertHelpCapacitiesFn = useServerFn(upsertHelpCapacities)
  const [isPending, startTransition] = useTransition()

  const methods = useForm<CapacitiesFormValues>()

  useEffect(() => {
    const defaultValues: CapacitiesFormValues = {
      capacities: tasks.reduce((acc, task) => {
        // Get current form values
        const currentValue = methods.getValues().capacities?.[task.id]

        // If there's a current user input, preserve it
        if (currentValue !== undefined) {
          acc[task.id] = currentValue
        }
        // Otherwise use the task's help capacity if valid
        else if (task.helpCapacity !== undefined && task.helpCapacity !== null
          && task.helpCapacity >= 1 && task.helpCapacity <= 5) {
          acc[task.id] = task.helpCapacity
        }
        // If no valid input or help capacity, set to undefined
        else {
          acc[task.id] = undefined
        }
        return acc
      }, {} as Record<string, number | undefined>),
    }

    methods.reset(defaultValues, {
      keepDirtyValues: true, // Keep user inputs
      keepErrors: true, // Keep any validation errors
    })
  }, [tasks, methods])

  const { handleSubmit, control, formState } = methods

  const onSave = async (values: CapacitiesFormValues) => {
    const updates = Object.entries(values.capacities)
      .filter(([_, val]) => val !== undefined && val >= 1 && val <= 5)
      .map(([taskId, capacity]) => ({
        taskId,
        capacity,
      }))
    if (updates.length === 0) {
      toast.warning('No valid capacities to update.')
      return
    }
    startTransition(async () => {
      const { success, message } = await upsertHelpCapacitiesFn({ data: { groupId, updates } })
      if (success) {
        toast.success(message)
        await router.invalidate()
      }
      else {
        toast.error(message)
      }
    })
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSave)} className="space-y-4">
        <h2 id="others-task-list" className="text-xl font-semibold">Others' Tasks</h2>
        <div className="space-y-3">
          {tasks
            .map(task => (
              <TaskCard
                key={task.id}
                taskId={task.id}
                description={task.description}
                userAvatar={task.avatarUrl}
                fullName={task.fullName}
                control={control}
              />
            ))}
        </div>
        {(isPending || formState.isDirty)
          && (
            <div className="flex justify-end">
              <Button
                size="sm"
                type="submit"
                disabled={isPending}
                className="hover:scale-105 transition-transform"
                aria-label={isPending ? 'Submitting help capacity scores' : 'Submit help capacity scores'}
                aria-busy={isPending}
                aria-live="polite"
              >
                {isPending
                  ? (<Spinner text="Submitting scores..." />)
                  : 'Submit Scores'}
              </Button>
            </div>
          )}
      </form>
    </FormProvider>
  )
}

export default OthersTasksForm
