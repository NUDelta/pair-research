import { createFileRoute } from '@tanstack/react-router'
import AuthPageShell from '@/features/auth/components/AuthPageShell'
import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm'
import { authPageSearchSchema, buildAuthPageHref } from '@/features/auth/schemas/authSearch'

export const Route = createFileRoute('/forgot-password')({
  validateSearch: search => authPageSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: 'Forgot password | Pair Research' }],
  }),
  component: ForgotPasswordPage,
})

function ForgotPasswordPage() {
  const { email, next } = Route.useSearch()

  return (
    <AuthPageShell
      alternatePrompt="Remembered your password?"
      alternateLabel="Back to sign in"
      alternateHref={buildAuthPageHref('/login', { email, nextPath: next })}
      title="Reset your password"
      description="Enter your email and we will send you a secure link to choose a new password."
    >
      <ForgotPasswordForm
        defaultEmail={email}
        nextPath={next}
      />
    </AuthPageShell>
  )
}
