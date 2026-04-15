import { createFileRoute, redirect } from '@tanstack/react-router'
import SingleGroupPageContent from '@/features/groups/components/detail/SingleGroupPageContent'
import SingleGroupPending from '@/features/groups/components/pending/SingleGroupPending'
import { getSingleGroup } from '@/features/groups/server/groups/getSingleGroup'

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
  return (
    <SingleGroupPageContent
      groupInfo={groupInfo}
      initialTasks={initialTasks}
      currentUserActivePairingTaskWithProfile={currentUserActivePairingTaskWithProfile}
    />
  )
}
