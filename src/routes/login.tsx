import { createFileRoute, redirect } from '@tanstack/react-router'
import AuthPageShell from '@/features/auth/components/AuthPageShell'
import LoginForm from '@/features/auth/components/LoginForm'
import { authPageSearchSchema, buildAuthPageHref } from '@/features/auth/schemas/authSearch'
import { getCurrentUser } from '@/features/auth/server'
import { buildSeoHead, SEO_NOINDEX_ROBOTS } from '@/shared/seo'

export const Route = createFileRoute('/login')({
  validateSearch: search => authPageSearchSchema.parse(search),
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUser()

    if (user) {
      throw redirect({ href: search.next ?? '/groups' })
    }
  },
  head: () => buildSeoHead({
    title: 'Sign in',
    description: 'Sign in to Pair Research with Google or email to manage groups and pair-support workflows.',
    path: '/login',
    robots: SEO_NOINDEX_ROBOTS,
  }),
  component: LoginPage,
})

function LoginPage() {
  const { email, next, notice } = Route.useSearch()

  return (
    <AuthPageShell
      mode="login"
      alternatePrompt="Need an account?"
      alternateLabel="Create one"
      alternateHref={buildAuthPageHref('/signup', { email, nextPath: next })}
    >
      <LoginForm
        defaultEmail={email}
        nextPath={next}
        notice={notice}
      />
    </AuthPageShell>
  )
}
