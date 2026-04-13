import { createFileRoute } from '@tanstack/react-router'
import AccountForm from '@/features/account/components/AccountForm'
import AccountPagePending from '@/features/account/components/AccountPagePending'
import { getOrCreateProfile } from '@/features/account/server/getOrCreateProfile'

export const Route = createFileRoute('/_authed/account')({
  loader: async () => getOrCreateProfile(),
  pendingComponent: AccountPagePending,
  head: () => ({
    meta: [{ title: 'Account Settings | Pair Research' }],
  }),
  component: AccountPage,
})

function AccountPage() {
  const { full_name, avatar_url, email } = Route.useLoaderData()

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Account Settings</h1>

      <AccountForm
        full_name={full_name}
        avatar_url={avatar_url}
        email={email}
      />

      <div>
        <h2 className="mt-8 text-lg font-medium">Account Management</h2>
        <p className="text-sm text-muted-foreground">
          Email and password updates coming soon...
        </p>
      </div>
    </div>
  )
}
