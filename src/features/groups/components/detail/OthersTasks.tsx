import { AlertCircle } from 'lucide-react'
import HorseRace from './HorseRace'
import OthersTasksForm from './OthersTasksForm'

interface OthersTasksProps {
  currentUserId: string
  groupId: string
  currentUserHasTask?: boolean
  currentUserInPool?: boolean
  hasActivePairing?: boolean
  isAdmin?: boolean
  raceTasks?: Task[]
  tasks?: Task[]
}

const OthersTasks = ({
  currentUserId,
  groupId,
  currentUserHasTask,
  currentUserInPool,
  hasActivePairing,
  isAdmin,
  raceTasks = [],
  tasks = [],
}: OthersTasksProps) => {
  if (hasActivePairing) {
    return (
      <div className="space-y-4">
        <HorseRace currentUserId={currentUserId} tasks={raceTasks} />
        <div className="w-full py-12 flex flex-col items-center text-center text-muted-foreground">
          <AlertCircle className="w-10 h-10 mb-2 text-gray-400" />
          <p className="text-lg font-medium">This round is complete</p>
          <p className="text-sm mt-1">
            {isAdmin
              ? 'Reset the pool when you are ready to start the next pairing round.'
              : 'Wait for an admin to reset the pool before the next round begins.'}
          </p>
        </div>
      </div>
    )
  }

  if (tasks.length > 0) {
    return (
      <OthersTasksForm
        currentUserId={currentUserId}
        groupId={groupId}
        raceTasks={raceTasks}
        tasks={tasks}
        canRate={currentUserInPool === true}
      />
    )
  }

  return (
    <div className="space-y-4">
      <HorseRace currentUserId={currentUserId} tasks={raceTasks} />
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
            You&apos;re the only person in the pool right now.
          </p>
        )}
      </div>
    </div>
  )
}

export default OthersTasks
