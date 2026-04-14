import { createFileRoute, redirect } from '@tanstack/react-router'
import AuthEmailStatusNotice from '@/features/auth/components/AuthEmailStatusNotice'
import AuthPageShell from '@/features/auth/components/AuthPageShell'
import SignupForm from '@/features/auth/components/SignupForm'
import { authPageSearchSchema, buildAuthPageHref } from '@/features/auth/schemas/authSearch'
import { getCurrentUser } from '@/features/auth/server'

export const Route = createFileRoute('/signup')({
  validateSearch: search => authPageSearchSchema.parse(search),
  beforeLoad: async ({ search }) => {
    const user = await getCurrentUser()

    if (user) {
      throw redirect({ href: search.next ?? '/groups' })
    }
  },
  head: () => ({
    meta: [{ title: 'Sign up | Pair Research' }],
  }),
  component: SignupPage,
})

function SignupPage() {
  const { email, next, notice } = Route.useSearch()

  return (
    <AuthPageShell
      mode="signup"
      alternatePrompt="Already have an account?"
      alternateLabel="Sign in"
      alternateHref={buildAuthPageHref('/login', { email, nextPath: next })}
    >
      <div className="space-y-5">
        {notice !== undefined && (
          <AuthEmailStatusNotice
            actionHref={buildAuthPageHref('/login', { email, nextPath: next })}
            actionLabel="Go to sign in"
            email={email}
            variant={notice}
          />
        )}
        <SignupForm
          defaultEmail={email}
          nextPath={next}
        />
      </div>
    </AuthPageShell>
  )
}
