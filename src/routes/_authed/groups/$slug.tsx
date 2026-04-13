import { createFileRoute, redirect } from '@tanstack/react-router'
import { LeavePoolButton, MakePairsButton } from '@/features/groups/components/detail/buttons'
import OthersTasks from '@/features/groups/components/detail/OthersTasks'
import Pairing from '@/features/groups/components/detail/Pairing'
import TaskCard from '@/features/groups/components/detail/TaskCard'
import SingleGroupPending from '@/features/groups/components/pending/SingleGroupPending'
import { getSingleGroup } from '@/features/groups/server/groups'
import { Button } from '@/shared/ui/button'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const Route = createFileRoute('/_authed/groups/$slug')({
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
  const { groupInfo, tasks, currentUserActivePairingTaskWithProfile } = Route.useLoaderData()
  const { userId: currentUserId } = groupInfo

  const currentUserTask = tasks.find(task => task.userId === currentUserId)
  const othersTasks = tasks.filter(task => task.userId !== currentUserId)

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold" aria-label="Group title">
          {groupInfo.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          {currentUserTask !== undefined && (
            <LeavePoolButton
              taskId={currentUserTask.id}
              groupId={groupInfo.id}
            />
          )}
          {groupInfo.isAdmin && (
            <>
              <Button variant="destructive" aria-label="Reset Pool">
                Reset Pool
              </Button>
              <MakePairsButton groupId={groupInfo.id} />
            </>
          )}
        </div>
      </div>

      {currentUserActivePairingTaskWithProfile !== null && (
        <Pairing pairingInfo={currentUserActivePairingTaskWithProfile} />
      )}

      <TaskCard
        currentUserId={currentUserId}
        groupId={groupInfo.id}
        description={currentUserTask?.description}
        userAvatar={groupInfo.avatarUrl}
        fullName={groupInfo.fullName}
      />

      <OthersTasks
        groupId={groupInfo.id}
        currentUserId={currentUserId}
        currentUserHasTask={currentUserTask !== undefined}
        initialTasks={othersTasks}
      />
    </div>
  )
}
