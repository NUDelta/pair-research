import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/lib/actions/auth'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) {
      const next = encodeURIComponent(location.href)
      throw redirect({ href: `/?next=${next}` })
    }

    return { user }
  },
  component: Outlet,
})
