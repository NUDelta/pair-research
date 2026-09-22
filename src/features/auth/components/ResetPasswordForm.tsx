import type { PasswordRecoveryAuthorization } from '@/features/auth/lib/passwordRecovery'
import type { ResetPasswordFormValues } from '@/features/auth/schemas/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangle, KeyRound, LoaderCircle } from 'lucide-react'
import { useEffect, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { clearPasswordRecoveryAuthorization, matchesPasswordRecoveryAuthorization } from '@/features/auth/lib/passwordRecovery'
import { resetPasswordFormSchema } from '@/features/auth/schemas/auth'
import { buildAuthPageHref } from '@/features/auth/schemas/authSearch'
import { createClient } from '@/shared/supabase/client'
import { Button } from '@/shared/ui/button'
import AuthField from './AuthField'
import AuthStatusCard from './AuthStatusCard'

interface ResetPasswordFormProps {
  recoveryAuthorization: PasswordRecoveryAuthorization | null
  isCheckingRecovery: boolean
  nextPath?: string
}

export default function ResetPasswordForm({
  recoveryAuthorization,
  isCheckingRecovery,
  nextPath = '/groups',
}: ResetPasswordFormProps) {
  const navigate = useNavigate()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: 'onChange',
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (recoveryAuthorization === null && !isCheckingRecovery) {
      toast.error('This password reset link is missing or has expired.')
    }
  }, [recoveryAuthorization, isCheckingRecovery])

  const onSubmit = async ({ password }: ResetPasswordFormValues) => {
    if (recoveryAuthorization === null) {
      setError('root', { message: 'Open the reset link from your email to continue.' })
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const { data: currentSessionData, error: currentSessionError } = await supabase.auth.getSession()
      const { data: currentUserData, error: currentUserError } = await supabase.auth.getUser()
      if (
        currentSessionError !== null
        || currentUserError !== null
        || currentUserData.user?.id !== recoveryAuthorization.userId
        || !matchesPasswordRecoveryAuthorization(currentSessionData.session, recoveryAuthorization)
      ) {
        clearPasswordRecoveryAuthorization(globalThis.sessionStorage)
        setError('root', { message: 'The password recovery session changed. Request a new reset link.' })
        return
      }

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        toast.error(error.message)
        setError('root', { message: error.message })
        return
      }

      await router.invalidate()
      clearPasswordRecoveryAuthorization(globalThis.sessionStorage)
      toast.success('Password updated successfully. You are now signed in.')
      await navigate({ href: sanitizeRedirectPath(nextPath, '/groups') })
    })
  }

  if (isCheckingRecovery) {
    return (
      <AuthStatusCard
        description="We are validating your secure password reset link."
        detail="This usually completes in a moment. Keep this page open while we finish the recovery check."
        detailTitle="Checking link"
        icon={KeyRound}
        title="Preparing secure reset"
      />
    )
  }

  if (recoveryAuthorization === null) {
    return (
      <AuthStatusCard
        actionHref={buildAuthPageHref('/forgot-password', { nextPath })}
        actionLabel="Request a new link"
        description="Open the password reset link from your email to create a new password. This link may have expired or already been used."
        detail="Request another reset email if you need a fresh link, then return here from that message."
        detailTitle="Next step"
        icon={AlertTriangle}
        title="Reset link required"
        tone="amber"
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <AuthField
        id="password"
        label="New Password"
        type="password"
        autocomplete="new-password"
        placeholder="Create a strong password"
        error={errors.password}
        register={register}
      />

      <AuthField
        id="confirmPassword"
        label="Confirm New Password"
        type="password"
        autocomplete="new-password"
        placeholder="Re-enter your password"
        error={errors.confirmPassword}
        register={register}
      />

      {errors.root && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        className="h-12 w-full rounded-xl text-sm font-semibold"
        disabled={!isValid || isPending}
      >
        {isPending
          ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Updating password...
              </>
            )
          : 'Update password'}
      </Button>
    </form>
  )
}
