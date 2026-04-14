import { createFileRoute } from '@tanstack/react-router'
import AuthPageShell from '@/features/auth/components/AuthPageShell'
import SignupForm from '@/features/auth/components/SignupForm'
import { authPageSearchSchema, buildAuthPageHref } from '@/features/auth/schemas/authSearch'

export const Route = createFileRoute('/signup')({
  validateSearch: search => authPageSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: 'Sign up | Pair Research' }],
  }),
  component: SignupPage,
})

function SignupPage() {
  const { next } = Route.useSearch()

  return (
    <AuthPageShell
      mode="signup"
      alternatePrompt="Already have an account?"
      alternateLabel="Sign in"
      alternateHref={buildAuthPageHref('/login', next)}
    >
      <SignupForm
        nextPath={next}
        loginHref={buildAuthPageHref('/login', next)}
      />
    </AuthPageShell>
  )
}
