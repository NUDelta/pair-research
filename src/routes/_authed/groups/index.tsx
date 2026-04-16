import { createFileRoute, Link } from '@tanstack/react-router'
import GroupCard from '@/features/groups/components/GroupCard'
import GroupsPagePending from '@/features/groups/components/pending/GroupsPagePending'
import { getUserGroups } from '@/features/groups/server/groups/getUserGroups'
import { Button } from '@/shared/ui/button'

function compareJoinedAtDesc(
  leftGroup: { joinedAt: string },
  rightGroup: { joinedAt: string },
) {
  return Date.parse(rightGroup.joinedAt) - Date.parse(leftGroup.joinedAt)
}

export const Route = createFileRoute('/_authed/groups/')({
  loader: async () => getUserGroups(),
  pendingComponent: GroupsPagePending,
  head: () => ({
    meta: [{ title: 'Groups | Pair Research' }],
  }),
  component: GroupsPage,
})

function GroupsPage() {
  const groups = Route.useLoaderData()

  const pending = groups.filter(group => group.isPending).sort(compareJoinedAtDesc)
  const joined = groups.filter(group => !group.isPending).sort(compareJoinedAtDesc)

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="animate-subtle-rise flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button asChild className="hover:-translate-y-0.5 hover:shadow-md">
          <Link to="/groups/create">Create Group</Link>
        </Button>
      </div>

      {pending.length > 0 && (
        <section className="animate-subtle-rise-delayed">
          <h2 className="mb-4 text-xl font-semibold">Pending Invitations</h2>
          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
            {pending.map(g => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </section>
      )}

      {joined.length > 0
        ? (
            <section className="animate-subtle-rise-late">
              <h2 className="mb-4 text-xl font-semibold">Joined Groups</h2>
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
                {joined.map(g => (
                  <GroupCard key={g.id} group={g} href={g.id} />
                ))}
              </div>
            </section>
          )
        : (
            pending.length === 0 && (
              <div className="animate-subtle-rise-late py-10 text-center">
                <p className="mb-2">You haven&apos;t joined any groups yet.</p>
                <p className="mb-4">Request an invitation or create your own group.</p>
              </div>
            )
          )}
    </div>
  )
}
