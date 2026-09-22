import type { PasswordRecoveryAuthorization } from '@/features/auth/lib/passwordRecovery'
import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import AuthPageShell from '@/features/auth/components/AuthPageShell'
import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm'
import {
  clearPasswordRecoveryAuthorization,
  createPasswordRecoveryAuthorization,
  matchesPasswordRecoveryAuthorization,
  readPasswordRecoveryAuthorization,
  writePasswordRecoveryAuthorization,
} from '@/features/auth/lib/passwordRecovery'
import { buildAuthPageHref, resetPasswordSearchSchema } from '@/features/auth/schemas/authSearch'
import { buildSeoHead, SEO_NOINDEX_ROBOTS } from '@/shared/seo'
import { createClient } from '@/shared/supabase/client'

export const Route = createFileRoute('/reset-password')({
  validateSearch: search => resetPasswordSearchSchema.parse(search),
  head: () => buildSeoHead({
    title: 'Create a new password',
    description: 'Create a new Pair Research password after opening a secure reset link.',
    path: '/reset-password',
    robots: SEO_NOINDEX_ROBOTS,
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { next, recovery } = Route.useSearch()
  const [recoveryAuthorization, setRecoveryAuthorization] = useState<PasswordRecoveryAuthorization | null>(null)
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(recovery === '1')

  useEffect(() => {
    const supabase = createClient()
    let mounted = true

    const reconcileSession = (session: Parameters<typeof matchesPasswordRecoveryAuthorization>[0]) => {
      const stored = readPasswordRecoveryAuthorization(globalThis.sessionStorage)
      const authorized = recovery === '1' && matchesPasswordRecoveryAuthorization(session, stored)
        ? stored
        : null
      if (authorized === null && stored !== null) {
        clearPasswordRecoveryAuthorization(globalThis.sessionStorage)
      }
      setRecoveryAuthorization(authorized)
      setIsCheckingRecovery(false)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return
      }

      const authorization = createPasswordRecoveryAuthorization(event, session, recovery)
      if (authorization !== null) {
        writePasswordRecoveryAuthorization(globalThis.sessionStorage, authorization)
        setRecoveryAuthorization(authorization)
        setIsCheckingRecovery(false)
        return
      }

      reconcileSession(session)
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        reconcileSession(data.session)
      }
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [recovery])

  return (
    <AuthPageShell
      alternatePrompt="Need another reset link?"
      alternateLabel="Request one"
      alternateHref={buildAuthPageHref('/forgot-password', { nextPath: next })}
      title="Create a new password"
      description="Choose a new password for your account after opening the secure reset link from your email."
    >
      <ResetPasswordForm
        recoveryAuthorization={recoveryAuthorization}
        isCheckingRecovery={isCheckingRecovery}
        nextPath={next}
      />
    </AuthPageShell>
  )
}
