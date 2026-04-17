import type { LoginValues } from '@/features/auth/schemas/auth'
import type { AuthNotice } from '@/features/auth/schemas/authSearch'
import type { TurnstileFieldHandle } from '@/shared/turnstile/TurnstileField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { LoaderCircle } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { LOGIN_ERROR_CODES } from '@/features/auth/lib/loginResponse'
import { loginSchema } from '@/features/auth/schemas/auth'
import { buildAuthPageHref } from '@/features/auth/schemas/authSearch'
import { login } from '@/features/auth/server'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import TurnstileField from '@/shared/turnstile/TurnstileField'
import { Button } from '@/shared/ui/button'
import AuthEmailStatusNotice from './AuthEmailStatusNotice'
import AuthField from './AuthField'
import { OAuthButton } from './OAuthButton'

interface LoginFormProps {
  defaultEmail?: string
  nextPath?: string
  notice?: AuthNotice
  onAuthSuccess?: () => Promise<void> | void
}

const LoginForm = ({
  defaultEmail = '',
  nextPath = '/groups',
  notice,
  onAuthSuccess,
}: LoginFormProps) => {
  const turnstileRef = useRef<TurnstileFieldHandle>(null)
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(false)
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    clearErrors,
    getValues,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: defaultEmail, password: '' },
  })
  const loginFn = useServerFn(login)
  const [isPending, startTransition] = useTransition()
  const navigate = useNavigate()
  const router = useRouter()
  const activeNoticeVariant = pendingConfirmationEmail !== null ? 'check-email' : notice
  const activeNoticeEmail = pendingConfirmationEmail ?? defaultEmail

  const onSubmit = async (values: LoginValues) => {
    const turnstileToken = await turnstileRef.current?.ensureToken()
    if (turnstileToken == null || turnstileToken === '') {
      setError('root', { message: 'Please complete the security check to continue.' })
      return
    }

    startTransition(async () => {
      try {
        const result = await loginFn({
          data: {
            ...values,
            turnstileToken,
          },
        })

        if (result.success) {
          setPendingConfirmationEmail(null)
          await onAuthSuccess?.()
          await router.invalidate()
          const redirectUrl = new URL(sanitizeRedirectPath(nextPath, '/groups'), globalThis.location.origin)
          redirectUrl.searchParams.set('from', 'auth-login')
          globalThis.location.assign(redirectUrl.toString())
        }
        else {
          turnstileRef.current?.reset()
          if (result.code === LOGIN_ERROR_CODES.emailNotConfirmed) {
            setPendingConfirmationEmail(values.email.trim())
            clearErrors('root')
            toast.warning('Confirm your email to finish signing in.')
            return
          }

          if (result.code === TURNSTILE_ERROR_CODES.failed || result.code === TURNSTILE_ERROR_CODES.required) {
            turnstileRef.current?.requireInteractiveChallenge(result.message)
          }
          setPendingConfirmationEmail(null)
          toast.error(result.message)
          setError('root', { message: result.message })
        }
      }
      catch (error) {
        turnstileRef.current?.reset()
        const errorMessage = error instanceof Error ? error.message : 'Login failed'
        toast.error(errorMessage)
        setError('root', { message: errorMessage })
      }
    })
  }

  const handleForgotPassword = async () => {
    await navigate({
      href: buildAuthPageHref('/forgot-password', {
        email: getValues('email').trim(),
        nextPath,
      }),
    })
  }

  return (
    <div className="space-y-5">
      {activeNoticeVariant !== undefined && (
        <div className="animate-subtle-rise">
          <AuthEmailStatusNotice
            actionHref={activeNoticeVariant === 'check-email'
              ? buildAuthPageHref('/signup', {
                  email: activeNoticeEmail,
                  nextPath,
                  notice: 'check-email',
                })
              : undefined}
            actionLabel={activeNoticeVariant === 'check-email' ? 'Back to sign up' : undefined}
            email={activeNoticeEmail}
            variant={activeNoticeVariant}
          />
        </div>
      )}

      <OAuthButton nextPath={nextPath} />

      <form onSubmit={handleSubmit(onSubmit)} className="animate-subtle-rise-late space-y-5">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autocomplete="email"
          placeholder="Enter your email"
          error={errors.email}
          register={register}
        />

        <AuthField
          id="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          placeholder="Enter your password"
          error={errors.password}
          register={register}
        />

        <TurnstileField
          controllerRef={turnstileRef}
          action="login"
          mode="visible"
          description="Complete the security check before signing in."
          onVerifiedChange={setIsTurnstileVerified}
        />

        {errors.root && (
          <div className="animate-subtle-rise text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.root.message}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleForgotPassword}
            className="h-auto px-0 text-xs font-normal text-muted-foreground interactive-link hover:text-foreground"
          >
            Forgot password?
          </Button>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl text-sm font-semibold hover-lift-sm hover:shadow-md"
          disabled={!isValid || !isTurnstileVerified || isPending}
        >
          {isPending
            ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Verifying and signing in...
                </>
              )
            : (
                'Sign In'
              )}
        </Button>
      </form>
    </div>
  )
}

export default LoginForm
