import { createFileRoute } from '@tanstack/react-router'
import AuthPageShell from '@/features/auth/components/AuthPageShell'
import LoginForm from '@/features/auth/components/LoginForm'
import { authPageSearchSchema, buildAuthPageHref } from '@/features/auth/schemas/authSearch'

export const Route = createFileRoute('/login')({
  validateSearch: search => authPageSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: 'Sign in | Pair Research' }],
  }),
  component: LoginPage,
})

function LoginPage() {
  const { next } = Route.useSearch()

  return (
    <AuthPageShell
      mode="login"
      alternatePrompt="Need an account?"
      alternateLabel="Create one"
      alternateHref={buildAuthPageHref('/signup', next)}
    >
      <LoginForm nextPath={next} />
    </AuthPageShell>
  )
}
