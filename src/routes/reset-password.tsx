import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import AuthPageShell from '@/features/auth/components/AuthPageShell'
import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm'
import { buildAuthPageHref, resetPasswordSearchSchema } from '@/features/auth/schemas/authSearch'
import { createClient } from '@/shared/supabase/client'

export const Route = createFileRoute('/reset-password')({
  validateSearch: search => resetPasswordSearchSchema.parse(search),
  head: () => ({
    meta: [{ title: 'Create new password | Pair Research' }],
  }),
  component: ResetPasswordPage,
})

function ResetPasswordPage() {
  const { next, recovery } = Route.useSearch()
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(recovery === '1')

  useEffect(() => {
    const supabase = createClient()
    let mounted = true
    let timeoutId: ReturnType<typeof globalThis.setTimeout> | null = null

    async function syncRecoveryState() {
      if (recovery !== '1') {
        if (mounted) {
          setHasRecoverySession(false)
          setIsCheckingRecovery(false)
        }
        return
      }

      const { data } = await supabase.auth.getSession()
      if (!mounted) {
        return
      }

      if (data.session !== null) {
        setHasRecoverySession(true)
        setIsCheckingRecovery(false)
      }
    }

    void syncRecoveryState()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) {
        return
      }

      if (session !== null) {
        setHasRecoverySession(true)
        setIsCheckingRecovery(false)
      }
    })

    if (recovery === '1') {
      timeoutId = globalThis.setTimeout(async () => {
        const { data } = await supabase.auth.getSession()
        if (!mounted) {
          return
        }

        setHasRecoverySession(data.session !== null)
        setIsCheckingRecovery(false)
      }, 1500)
    }

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (timeoutId !== null) {
        globalThis.clearTimeout(timeoutId)
      }
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
        hasRecoverySession={hasRecoverySession}
        isCheckingRecovery={isCheckingRecovery}
        nextPath={next}
      />
    </AuthPageShell>
  )
}
