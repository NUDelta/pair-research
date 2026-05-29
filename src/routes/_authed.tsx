import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { getCurrentUser } from '@/features/auth/server'
import { SEO_NOINDEX_ROBOTS } from '@/shared/seo'

export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUser()
    if (!user) {
      const next = encodeURIComponent(location.href)
      throw redirect({ href: `/login?next=${next}` })
    }

    return { user }
  },
  head: () => ({
    meta: [{ name: 'robots', content: SEO_NOINDEX_ROBOTS }],
  }),
  component: Outlet,
})
