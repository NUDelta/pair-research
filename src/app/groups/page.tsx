import type { Metadata } from 'next'
import GroupCard from '@/components/groups/GroupCard'
import { Button } from '@/components/ui/button'
import { getUserGroups } from '@/lib/actions/groups'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Groups | Pair Research',
}

export default async function GroupsPage() {
  const groups = await getUserGroups()

  const pending = groups?.filter(g => g.isPending)
  const joined = groups?.filter(g => !g.isPending)
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime())

  return (
    <div className="container max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button>
          <Link href="/groups/create">
            Create Group
          </Link>
        </Button>
      </div>

      {pending !== undefined && pending.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Pending Invitations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
            {pending.map(g => (
              <GroupCard
                key={g.id}
                group={g}
              />
            ))}
          </div>
        </section>
      )}

      {joined !== undefined && joined.length > 0
        ? (
            <section>
              <h2 className="text-xl font-semibold mb-4">Joined Groups</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">
                {joined.map(g => (
                  <GroupCard
                    key={g.id}
                    group={g}
                    href={`/groups/${g.id}`}
                  />
                ))}
              </div>
            </section>
          )
        : (
            (pending === undefined || pending.length < 1) && (
              <div className="text-center py-10">
                <p className="mb-2">You haven't joined any groups yet.</p>
                <p className="mb-4">Request an invitation or create your own group.</p>
              </div>
            )
          )}
    </div>
  )
}
