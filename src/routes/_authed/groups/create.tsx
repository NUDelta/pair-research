import { createFileRoute } from '@tanstack/react-router'
import CreateGroupForm from '@/components/groups/create'
import CreateGroupPending from '@/components/pending/CreateGroupPending'

export const Route = createFileRoute('/_authed/groups/create')({
  pendingComponent: CreateGroupPending,
  head: () => ({
    meta: [{ title: 'Create A New Group | Pair Research' }],
  }),
  component: CreateGroupPage,
})

function CreateGroupPage() {
  return (
    <div className="container mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-2xl font-bold">Create A New Group</h1>
      <CreateGroupForm />
    </div>
  )
}
