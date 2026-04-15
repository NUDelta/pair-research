import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { Settings2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { LeavePoolButton, MakePairsButton, ResetPoolButton } from '@/features/groups/components/detail/buttons'
import GroupDetailHeader from '@/features/groups/components/detail/GroupDetailHeader'
import OthersTasks from '@/features/groups/components/detail/OthersTasks'
import Pairing from '@/features/groups/components/detail/Pairing'
import PairingSuccessConfetti from '@/features/groups/components/detail/PairingSuccessConfetti'
import TaskCard from '@/features/groups/components/detail/TaskCard'
import SingleGroupPending from '@/features/groups/components/pending/SingleGroupPending'
import { useRatingProgressRealtimeRefresh } from '@/features/groups/hooks/useRatingProgressRealtimeRefresh'
import { useTaskRealtimeListener } from '@/features/groups/hooks/useTaskRealtimeListener'
import { shouldCelebratePairingActivation } from '@/features/groups/lib/pairingCelebration'
import { getSingleGroup } from '@/features/groups/server/groups'
import { Button } from '@/shared/ui/button'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/_authed/groups/$slug/')({
  loader: async ({ params }) => {
    if (!UUID_REGEX.test(params.slug)) {
      throw redirect({ to: '/groups' })
    }

    const result = await getSingleGroup({ data: { groupId: params.slug } })
    if (!result) {
      throw redirect({ to: '/groups' })
    }

    return result
  },
  pendingComponent: SingleGroupPending,
  head: () => ({
    meta: [{ title: 'Group | Pair Research' }],
  }),
  component: SingleGroupPage,
})

function SingleGroupPage() {
  const { groupInfo, tasks: initialTasks, currentUserActivePairingTaskWithProfile } = Route.useLoaderData()
  const { userId: currentUserId } = groupInfo
  const [showPairingConfetti, setShowPairingConfetti] = useState(false)
  const previousActivePairingIdRef = useRef<string | null>(groupInfo.activePairingId ?? null)
  const { tasks } = useTaskRealtimeListener(groupInfo.id, currentUserId, initialTasks)
  useRatingProgressRealtimeRefresh(groupInfo.id, tasks.map(task => task.id))

  const currentUserTask = tasks.find(task => task.userId === currentUserId)
  const othersTasks = tasks.filter(task => task.userId !== currentUserId)
  const currentUserPoolStatus = currentUserActivePairingTaskWithProfile !== null
    ? 'paired'
    : currentUserTask !== undefined
      ? 'in-pool'
      : 'not-in-pool'

  useEffect(() => {
    const previousActivePairingId = previousActivePairingIdRef.current
    const nextActivePairingId = groupInfo.activePairingId ?? null

    if (shouldCelebratePairingActivation(previousActivePairingId, nextActivePairingId)) {
      // eslint-disable-next-line react/set-state-in-effect
      setShowPairingConfetti(true)
    }

    previousActivePairingIdRef.current = nextActivePairingId
  }, [groupInfo.activePairingId])

  return (
    <div className="container mx-auto flex max-w-5xl flex-col gap-6 p-6">
      {showPairingConfetti && (
        <PairingSuccessConfetti onComplete={() => setShowPairingConfetti(false)} />
      )}
      <GroupDetailHeader
        groupName={groupInfo.name}
        actions={(
          <>
            {groupInfo.isAdmin && (
              <Button asChild variant="outline">
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
                {groupInfo.hasActivePairing
                  ? <ResetPoolButton groupId={groupInfo.id} />
                  : <MakePairsButton groupId={groupInfo.id} eligibleTaskCount={tasks.length} />}
              </>
            )}
          </>
        )}
      />

      {currentUserActivePairingTaskWithProfile !== null && (
        <Pairing pairingInfo={currentUserActivePairingTaskWithProfile} />
      )}

      <TaskCard
        currentUserId={currentUserActivePairingTaskWithProfile === null ? currentUserId : undefined}
        groupId={currentUserActivePairingTaskWithProfile === null ? groupInfo.id : undefined}
        description={currentUserActivePairingTaskWithProfile === null
          ? currentUserTask?.description
          : 'You are currently in an active pairing. Reset the pool before changing your task.'}
        userAvatar={groupInfo.avatarUrl}
        fullName={groupInfo.fullName}
        poolStatus={currentUserPoolStatus}
      />

      <OthersTasks
        currentUserId={currentUserId}
        groupId={groupInfo.id}
        currentUserHasTask={
          currentUserTask !== undefined || currentUserActivePairingTaskWithProfile !== null
        }
        currentUserInPool={currentUserTask !== undefined}
        hasActivePairing={groupInfo.hasActivePairing}
        isAdmin={groupInfo.isAdmin}
        raceTasks={tasks}
        tasks={othersTasks}
      />
    </div>
  )
}
