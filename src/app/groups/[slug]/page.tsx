import type { Metadata } from 'next'
import LeavePoolButton from '@/components/groups/single/LeavePoolButton'
import OthersTasks from '@/components/groups/single/OthersTasks'
import TaskCard from '@/components/groups/single/TaskCard'
import { Button } from '@/components/ui/button'
import { getSingleGroup } from '@/lib/actions/groups'
import { redirect } from 'next/navigation'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export const metadata: Metadata = {
  title: 'Group | Pair Research',
}

export default async function SingleGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!UUID_REGEX.test(slug)) {
    redirect('/groups')
  }

  const res = await getSingleGroup(slug)

  if (!res) {
    redirect('/groups')
  }

  const { groupInfo, tasks } = res
  const { userId: currentUserId } = groupInfo

  const currentUserTask = tasks.find(task => task.userId === currentUserId)

  // This may be an empty array
  const othersTasks = tasks.filter(task => task.userId !== currentUserId)

  return (
    <div className="container max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h1 className="text-2xl font-bold" aria-label="Group title">
          {groupInfo.name}
        </h1>
        <div className="flex flex-wrap gap-2">
          {currentUserTask !== undefined
            && (
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
              <Button aria-label="Make Pairs">
                Make Pairs
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Current User's Task */}
      <TaskCard
        currentUserId={currentUserId}
        groupId={groupInfo.id}
        description={currentUserTask?.description}
        userAvatar={groupInfo.avatarUrl}
        fullName={groupInfo.fullName}
      />

      {/* Others' Tasks */}
      <OthersTasks
        groupId={groupInfo.id}
        currentUserId={currentUserId}
        currentUserHasTask={currentUserTask !== undefined}
        initialTasks={othersTasks}
      />
    </div>
  )
}
