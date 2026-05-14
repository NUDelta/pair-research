import { Link } from '@tanstack/react-router'
import { Settings2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LeavePoolButton, MakePairsButton, ResetPoolButton } from '@/features/groups/components/detail/buttons'
import GroupDetailHeader from '@/features/groups/components/detail/GroupDetailHeader'
import OthersTasks from '@/features/groups/components/detail/OthersTasks'
import Pairing from '@/features/groups/components/detail/Pairing'
import PairingSuccessConfetti from '@/features/groups/components/detail/PairingSuccessConfetti'
import { formatPairingRelativeTime } from '@/features/groups/components/detail/roundStatus'
import TaskCard from '@/features/groups/components/detail/TaskCard'
import { useRatingProgressRealtimeRefresh } from '@/features/groups/hooks/useRatingProgressRealtimeRefresh'
import { useTaskRealtimeListener } from '@/features/groups/hooks/useTaskRealtimeListener'
import { shouldCelebratePairingActivation } from '@/features/groups/lib/pairingCelebration'
import { Button } from '@/shared/ui/button'

interface SingleGroupPageContentProps {
  groupInfo: {
    id: string
    name: string
    activePairingId: string | null
    activePairingCreatedAt: string | null
    activePairCount: number
    activeRoundPairs: Array<{
      id: string
      members: Array<{
        userId: string
        fullName: string | null
        avatarUrl: string | null
        taskDescription: string | null
      }>
    }>
    lastPairingCreatedAt: string | null
    userId: string
    fullName: string | null
    avatarUrl: string | null
    isAdmin: boolean
    hasActivePairing: boolean
  }
  initialTasks: Task[]
  currentUserActivePairingTaskWithProfile: CurrentUserActivePair | null
}

export default function SingleGroupPageContent({
  groupInfo,
  initialTasks,
  currentUserActivePairingTaskWithProfile,
}: SingleGroupPageContentProps) {
  const { userId: currentUserId } = groupInfo
  const [showPairingConfetti, setShowPairingConfetti] = useState(false)
  const previousActivePairingIdRef = useRef<string | null>(groupInfo.activePairingId ?? null)
  const { tasks } = useTaskRealtimeListener(groupInfo.id, currentUserId, initialTasks)

  useRatingProgressRealtimeRefresh(groupInfo.id, tasks.map(task => task.id))

  const currentUserTask = tasks.find(task => task.userId === currentUserId)
  const othersTasks = tasks.filter(task => task.userId !== currentUserId)
  const currentUserLeftOutOfActivePairing
    = groupInfo.hasActivePairing
      && currentUserActivePairingTaskWithProfile === null
      && currentUserTask !== undefined
  const activeRoundRelativeTime = groupInfo.activePairingCreatedAt === null
    ? null
    : formatPairingRelativeTime(groupInfo.activePairingCreatedAt)
  const latestRoundRelativeTime = groupInfo.lastPairingCreatedAt === null
    ? null
    : formatPairingRelativeTime(groupInfo.lastPairingCreatedAt)
  const roundStatusLabel = groupInfo.hasActivePairing ? 'Active round' : undefined
  const roundStatusNote = groupInfo.hasActivePairing
    ? activeRoundRelativeTime === null
      ? null
      : `This pairing was made ${activeRoundRelativeTime}.`
    : latestRoundRelativeTime === null
      ? null
      : `Last pairing was made ${latestRoundRelativeTime}.`

  useEffect(() => {
    const previousActivePairingId = previousActivePairingIdRef.current
    const nextActivePairingId = groupInfo.activePairingId ?? null

    if (shouldCelebratePairingActivation(previousActivePairingId, nextActivePairingId)) {
      setShowPairingConfetti(true)
    }

    previousActivePairingIdRef.current = nextActivePairingId
  }, [groupInfo.activePairingId])

  return (
    <div className="container mx-auto flex max-w-5xl flex-col gap-6 p-6">
      {showPairingConfetti && (
        <PairingSuccessConfetti onComplete={() => setShowPairingConfetti(false)} />
      )}
      <div className="animate-subtle-rise">
        <GroupDetailHeader
          groupName={groupInfo.name}
          roundStatusLabel={roundStatusLabel}
          roundStatusNote={roundStatusNote}
          actions={(
            <>
              {groupInfo.isAdmin && (
                <Button asChild variant="outline" className="hover-lift-sm hover:shadow-sm">
                  <Link to="/groups/$slug/settings" params={{ slug: groupInfo.id }}>
                    <Settings2Icon data-icon="inline-start" />
                    Settings
                  </Link>
                </Button>
              )}
              {currentUserTask !== undefined && (
                <LeavePoolButton
                  taskId={currentUserTask.id}
                  groupId={groupInfo.id}
                />
              )}
              {groupInfo.isAdmin && (
                <>
                  <ResetPoolButton groupId={groupInfo.id} />
                  {!groupInfo.hasActivePairing && (
                    <MakePairsButton
                      groupId={groupInfo.id}
                      eligibleTaskCount={tasks.length}
                    />
                  )}
                </>
              )}
            </>
          )}
        />
      </div>

      {currentUserActivePairingTaskWithProfile !== null && (
        <div className="animate-subtle-rise-delayed">
          <Pairing pairingInfo={currentUserActivePairingTaskWithProfile} />
        </div>
      )}

      {(!groupInfo.hasActivePairing || currentUserLeftOutOfActivePairing) && (
        <div className="animate-subtle-rise-late">
          <TaskCard
            currentUserId={!groupInfo.hasActivePairing ? currentUserId : undefined}
            groupId={!groupInfo.hasActivePairing ? groupInfo.id : undefined}
            description={currentUserTask?.description}
            userAvatar={groupInfo.avatarUrl}
            fullName={groupInfo.fullName}
            poolStatus={currentUserLeftOutOfActivePairing
              ? 'solo'
              : currentUserTask !== undefined
                ? 'in-pool'
                : 'not-in-pool'}
          />
        </div>
      )}

      <div className="animate-subtle-rise-late">
        <OthersTasks
          activePairCount={groupInfo.activePairCount}
          activeRoundPairs={groupInfo.activeRoundPairs}
          currentUserId={currentUserId}
          currentUserHasActivePairing={currentUserActivePairingTaskWithProfile !== null}
          groupId={groupInfo.id}
          currentUserHasTask={
            currentUserTask !== undefined || currentUserActivePairingTaskWithProfile !== null
          }
          currentUserInPool={currentUserTask !== undefined}
          currentUserLeftOut={currentUserLeftOutOfActivePairing}
          hasActivePairing={groupInfo.hasActivePairing}
          isAdmin={groupInfo.isAdmin}
          raceTasks={tasks}
          tasks={othersTasks}
        />
      </div>
    </div>
  )
}
