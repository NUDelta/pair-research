import type { Metadata } from 'next'
import AccountForm from '@/components/account/AccountForm'
import { getOrCreateProfile } from '@/lib/actions/profile/getOrCreateProfile'

export const metadata: Metadata = {
  title: 'Account Settings | Pair Research',
}

export default async function AccountPage() {
  const { full_name, avatar_url, email } = await getOrCreateProfile()

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Account Settings</h1>

      <AccountForm
        full_name={full_name}
        avatar_url={avatar_url}
        email={email}
      />

      {/* Placeholder section for future features */}
      <div>
        <h2 className="text-lg font-medium mt-8">Account Management</h2>
        <p className="text-sm text-muted-foreground">
          Email and password updates coming soon...
        </p>
      </div>
    </div>
  )
}
