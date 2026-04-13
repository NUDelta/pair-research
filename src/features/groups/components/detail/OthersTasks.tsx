import { AlertCircle } from 'lucide-react'
import { useTaskRealtimeListener } from '@/features/groups/hooks/useTaskRealtimeListener'
import OthersTasksForm from './OthersTasksForm'

interface OthersTasksProps {
  groupId: string
  currentUserId: string
  currentUserHasTask?: boolean
  currentUserInPool?: boolean
  initialTasks?: Task[]
}

const OthersTasks = ({
  groupId,
  currentUserId,
  currentUserHasTask,
  currentUserInPool,
  initialTasks,
}: OthersTasksProps) => {
  const { tasks } = useTaskRealtimeListener(groupId, currentUserId, initialTasks)

  if (tasks.length > 0) {
    return (
      <OthersTasksForm
        groupId={groupId}
        tasks={tasks}
        canRate={currentUserInPool === true}
        currentUserInPool={currentUserInPool === true}
      />
    )
  }

  return (
    <div className="w-full py-12 flex flex-col items-center text-center text-muted-foreground">
      <AlertCircle className="w-10 h-10 mb-2 text-gray-400" />
      <p className="text-lg font-medium">No tasks from others yet</p>
      <p className="text-sm mt-1">
        {currentUserHasTask
          ? 'Hang tight! Others may add their tasks soon.'
          : 'You can start by posting your own task.'}
      </p>
      {currentUserInPool && (
        <p className="mt-3 text-sm">
          1 person is currently in the pool. There are 0 other users to rate right now.
        </p>
      )}
    </div>
  )
}

export default OthersTasks
