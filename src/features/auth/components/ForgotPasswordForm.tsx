import type { LoginValues } from '@/features/auth/schemas/auth'
import type { TurnstileFieldHandle } from '@/shared/turnstile/TurnstileField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useServerFn } from '@tanstack/react-start'
import { LoaderCircle, MailCheck } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { loginSchema } from '@/features/auth/schemas/auth'
import { buildAuthPageHref } from '@/features/auth/schemas/authSearch'
import { requestPasswordReset } from '@/features/auth/server'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import TurnstileField from '@/shared/turnstile/TurnstileField'
import { Button } from '@/shared/ui/button'
import AuthField from './AuthField'
import AuthStatusCard from './AuthStatusCard'

interface ForgotPasswordFormProps {
  defaultEmail?: string
  nextPath?: string
}

export default function ForgotPasswordForm({
  defaultEmail = '',
  nextPath = '/groups',
}: ForgotPasswordFormProps) {
  const turnstileRef = useRef<TurnstileFieldHandle>(null)
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(false)
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null)
  const requestPasswordResetFn = useServerFn(requestPasswordReset)
  const [isPending, startTransition] = useTransition()
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
  } = useForm<Pick<LoginValues, 'email'>>({
    resolver: zodResolver(loginSchema.pick({ email: true })),
    mode: 'onChange',
    defaultValues: {
      email: defaultEmail,
    },
  })

  const onSubmit = async ({ email }: Pick<LoginValues, 'email'>) => {
    const turnstileToken = await turnstileRef.current?.ensureToken()
    if (turnstileToken == null || turnstileToken === '') {
      setError('root', { message: 'Please complete the security check to continue.' })
      return
    }

    startTransition(async () => {
      try {
        const result = await requestPasswordResetFn({
          data: {
            email,
            nextPath,
            turnstileToken,
          },
        })

        if (result.success) {
          const trimmedEmail = email.trim()
          setRequestedEmail(trimmedEmail)
          toast.success(result.message)
          turnstileRef.current?.reset()
          return
        }

        turnstileRef.current?.reset()
        if (result.code === TURNSTILE_ERROR_CODES.failed || result.code === TURNSTILE_ERROR_CODES.required) {
          turnstileRef.current?.requireInteractiveChallenge(result.message)
        }
        toast.error(result.message)
        setError('root', { message: result.message })
      }
      catch (error) {
        turnstileRef.current?.reset()
        const errorMessage = error instanceof Error ? error.message : 'Password reset request failed'
        toast.error(errorMessage)
        setError('root', { message: errorMessage })
      }
    })
  }

  if (requestedEmail !== null) {
    return (
      <AuthStatusCard
        actionHref={buildAuthPageHref('/login', {
          email: requestedEmail,
          nextPath,
        })}
        actionLabel="Back to sign in"
        description={(
          <>
            If an account exists for
            {' '}
            <span className="font-semibold">{requestedEmail}</span>
            , we sent a password reset link. Open the email on this device to continue.
          </>
        )}
        detail="The message can take a minute to arrive. Check spam or promotions if you do not see it, then request another link if needed."
        detailTitle="What to expect"
        icon={MailCheck}
        title="Check your inbox"
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <AuthField
        id="email"
        label="Email"
        type="email"
        autocomplete="email"
        placeholder="Enter your email"
        error={errors.email}
        register={register}
      />

      <TurnstileField
        controllerRef={turnstileRef}
        action="forgot-password"
        mode="visible"
        description="Complete the security check before we send the reset link."
        onVerifiedChange={setIsTurnstileVerified}
      />

      {errors.root && (
        <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.root.message}
        </div>
      )}

      <Button
        type="submit"
        className="h-12 w-full rounded-xl text-sm font-semibold"
        disabled={!isValid || !isTurnstileVerified || isPending}
      >
        {isPending
          ? (
              <>
                <LoaderCircle className="mr-2 size-4 animate-spin" />
                Sending reset link...
              </>
            )
          : 'Send reset link'}
      </Button>
    </form>
  )
}
