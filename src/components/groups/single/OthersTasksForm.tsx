import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { upsertHelpCapacities } from '@/lib/actions/task'
import { useRouter } from 'next/navigation'
import { useEffect, useTransition } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
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
  const [isPending, startTransition] = useTransition()

  const methods = useForm<CapacitiesFormValues>()

  useEffect(() => {
    const defaultValues: CapacitiesFormValues = {
      capacities: tasks.reduce((acc, task) => {
        if (task.helpCapacity !== undefined && task.helpCapacity !== null
          && task.helpCapacity >= 1 && task.helpCapacity <= 5) {
          acc[task.id] = task.helpCapacity
        }
        else {
          acc[task.id] = undefined
        }
        return acc
      }, {} as Record<string, number | undefined>),
    }

    methods.reset(defaultValues)
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
      const { success, message } = await upsertHelpCapacities(groupId, updates)
      if (success) {
        toast.success(message)
        router.refresh()
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
