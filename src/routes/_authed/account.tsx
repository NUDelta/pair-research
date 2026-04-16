import { createFileRoute, Link } from '@tanstack/react-router'
import AccountForm from '@/features/account/components/AccountForm'
import AccountPagePending from '@/features/account/components/AccountPagePending'
import { getOrCreateProfile } from '@/features/account/server/getOrCreateProfile'
import { buildLegalPageHref } from '@/features/legal/lib/legalLinks'

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
      <h1 className="animate-subtle-rise text-2xl font-semibold">Account Settings</h1>

      <AccountForm
        full_name={full_name}
        avatar_url={avatar_url}
        email={email}
      />

      <div className="animate-subtle-rise-delayed">
        <h2 className="mt-8 text-lg font-medium">Account Management</h2>
        <p className="text-sm text-muted-foreground">
          Email and password updates coming soon...
        </p>
      </div>

      <div className="animate-subtle-rise-late rounded-3xl border border-slate-200/80 bg-white/80 p-5 transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-md">
        <h2 className="text-lg font-medium text-slate-950">Legal</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review the current Terms of Service and Privacy Policy for Pair Research.
        </p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
          <Link
            to={buildLegalPageHref('/terms', 'account')}
            className="text-sky-700 transition-[color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:text-slate-950"
          >
            Terms of Service
          </Link>
          <Link
            to={buildLegalPageHref('/privacy', 'account')}
            className="text-sky-700 transition-[color,transform] duration-300 ease-out hover:-translate-y-0.5 hover:text-slate-950"
          >
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  )
}
