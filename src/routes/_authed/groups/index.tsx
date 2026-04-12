import { createFileRoute, Link } from '@tanstack/react-router'
import GroupCard from '@/components/groups/GroupCard'
import GroupsPagePending from '@/components/pending/GroupsPagePending'
import { Button } from '@/components/ui/button'
import { getUserGroups } from '@/lib/actions/groups'

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

  const pending = groups?.filter(g => g.isPending)
  const joined = groups?.filter(g => !g.isPending)
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button asChild>
          <Link to="/groups/create">Create Group</Link>
        </Button>
      </div>

      {pending !== undefined && pending.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Pending Invitations</h2>
          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
            {pending.map(g => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        </section>
      )}

      {joined !== undefined && joined.length > 0
        ? (
            <section>
              <h2 className="mb-4 text-xl font-semibold">Joined Groups</h2>
              <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
                {joined.map(g => (
                  <GroupCard key={g.id} group={g} href={g.id} />
                ))}
              </div>
            </section>
          )
        : (
            (pending === undefined || pending.length < 1) && (
              <div className="py-10 text-center">
                <p className="mb-2">You haven&apos;t joined any groups yet.</p>
                <p className="mb-4">Request an invitation or create your own group.</p>
              </div>
            )
          )}
    </div>
  )
}
