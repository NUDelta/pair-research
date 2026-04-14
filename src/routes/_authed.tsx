import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/features/auth/server'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) {
      const next = encodeURIComponent(location.href)
      throw redirect({ href: `/login?next=${next}` })
    }

    return { user }
  },
  component: Outlet,
})
