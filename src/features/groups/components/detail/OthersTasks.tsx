import { AlertCircle } from 'lucide-react'
import ActiveRoundPanel from './ActiveRoundPanel'
import HorseRace from './HorseRace'
import OthersTasksForm from './OthersTasksForm'

interface OthersTasksProps {
  activePairCount?: number
  activeRoundPairs?: Array<{
    id: string
    members: Array<{
      userId: string
      fullName: string | null
      avatarUrl: string | null
      taskDescription: string | null
    }>
  }>
  currentUserId: string
  groupId: string
  currentUserHasTask?: boolean
  currentUserInPool?: boolean
  currentUserLeftOut?: boolean
  hasActivePairing?: boolean
  isAdmin?: boolean
  raceTasks?: Task[]
  tasks?: Task[]
}

const OthersTasks = ({
  activePairCount = 0,
  activeRoundPairs = [],
  currentUserId,
  groupId,
  currentUserHasTask,
  currentUserInPool,
  currentUserLeftOut = false,
  hasActivePairing,
  isAdmin,
  raceTasks = [],
  tasks = [],
}: OthersTasksProps) => {
  if (hasActivePairing) {
    return (
      <div className="space-y-4">
        <ActiveRoundPanel
          activePairCount={activePairCount}
          currentUserLeftOut={currentUserLeftOut}
          isAdmin={isAdmin === true}
          pairSummaries={activeRoundPairs}
          leftOutNames={tasks.map(task => task.fullName ?? 'Group member')}
        />
        <HorseRace currentUserId={currentUserId} tasks={raceTasks} />
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
      <div className="animate-subtle-rise w-full py-12 flex flex-col items-center text-center text-muted-foreground">
        <AlertCircle className="mb-2 h-10 w-10 text-gray-400 motion-smooth motion-safe:hover:scale-[1.03]" />
        <p className="text-lg font-medium">No tasks from others yet</p>
        <p className="text-sm mt-1">
          {currentUserHasTask
            ? currentUserInPool
              ? 'Ask another member to add a task so ratings can start.'
              : 'Add your task from the card above to rejoin the pool for this round.'
            : 'Add your task from the card above to join the pool and get the round started.'}
        </p>
        {currentUserInPool && (
          <p className="mt-3 text-sm">
            You&apos;re the only person in the pool right now.
          </p>
        )}
      </div>
      <HorseRace currentUserId={currentUserId} tasks={raceTasks} />
    </div>
  )
}

export default OthersTasks
