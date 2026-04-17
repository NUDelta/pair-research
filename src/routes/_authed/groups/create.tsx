import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon, FolderPlusIcon } from 'lucide-react'
import CreateGroupForm from '@/features/groups/components/create/CreateGroupForm'
import CreateGroupPending from '@/features/groups/components/pending/CreateGroupPending'
import { Button } from '@/shared/ui/button'

export const Route = createFileRoute('/_authed/groups/create')({
  pendingComponent: CreateGroupPending,
  head: () => ({
    meta: [{ title: 'Create A New Group | Pair Research' }],
  }),
  component: CreateGroupPage,
})

function CreateGroupPage() {
  return (
    <div className="container mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4">
        <Button variant="ghost" size="sm" asChild className="w-fit">
          <Link to="/groups">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to groups
          </Link>
        </Button>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <FolderPlusIcon className="size-5 text-muted-foreground" />
            <h1 className="text-3xl font-semibold tracking-tight">Create a group</h1>
          </div>
          <p className="max-w-3xl text-muted-foreground">
            Set up the basics, define roles, and invite collaborators with the same card
            structure you&apos;ll manage later in group settings.
          </p>
        </div>
      </div>
      <CreateGroupForm />
    </div>
  )
}
