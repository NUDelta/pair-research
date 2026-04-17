import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import GroupCard from '@/features/groups/components/GroupCard'
import GroupsPagePending from '@/features/groups/components/pending/GroupsPagePending'
import { applyInvitationAcceptance, createGroupListOptimisticUpdate } from '@/features/groups/lib/optimisticGroups'
import { acceptGroupInvitation } from '@/features/groups/server/groups/acceptGroupInvitation'
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
  const router = useRouter()
  const acceptGroupInvitationFn = useServerFn(acceptGroupInvitation)
  const [optimisticGroups, setOptimisticGroups] = useState(groups)
  const [acceptingGroupIds, setAcceptingGroupIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    // eslint-disable-next-line react/set-state-in-effect
    setOptimisticGroups(groups)
  }, [groups])

  const applyOptimisticUpdate = (recipe: import('@/features/groups/lib/optimisticGroups').GroupListOptimisticRecipe) => {
    let rollback = (currentState: typeof groups) => currentState

    setOptimisticGroups((currentGroups) => {
      const update = createGroupListOptimisticUpdate(currentGroups, recipe)
      rollback = update.rollback
      return update.nextState
    })

    return () => {
      setOptimisticGroups(currentGroups => rollback(currentGroups))
    }
  }

  const handleAcceptInvitation = async (groupId: string) => {
    const rollback = applyOptimisticUpdate((draft) => {
      applyInvitationAcceptance(draft, groupId)
    })

    setAcceptingGroupIds(current => ({
      ...current,
      [groupId]: true,
    }))

    const { success, message } = await acceptGroupInvitationFn({ data: { groupId } })

    setAcceptingGroupIds((current) => {
      const { [groupId]: _removed, ...rest } = current
      return rest
    })

    if (!success) {
      rollback()
      toast.error(message)
      return
    }

    toast.success(message)
    void router.invalidate()
  }

  const pending = optimisticGroups.filter(group => group.isPending).sort(compareJoinedAtDesc)
  const joined = optimisticGroups.filter(group => !group.isPending).sort(compareJoinedAtDesc)

  return (
    <div className="container mx-auto max-w-5xl space-y-6 p-6">
      <div className="animate-subtle-rise flex items-center justify-between">
        <h1 className="text-2xl font-bold">Groups</h1>
        <Button asChild className="hover-lift-sm hover:shadow-md">
          <Link to="/groups/create">Create Group</Link>
        </Button>
      </div>

      {pending.length > 0 && (
        <section className="animate-subtle-rise-delayed">
          <h2 className="mb-4 text-xl font-semibold">Pending Invitations</h2>
          <div className="grid auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
            {pending.map(g => (
              <GroupCard
                key={g.id}
                group={g}
                isAccepting={acceptingGroupIds[g.id] === true}
                onAcceptInvitation={handleAcceptInvitation}
              />
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
