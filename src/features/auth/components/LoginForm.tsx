import type { LoginValues } from '@/features/auth/schemas/auth'
import type { TurnstileFieldHandle } from '@/shared/turnstile/TurnstileField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { LoaderCircle } from 'lucide-react'
import { useRef, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { loginSchema } from '@/features/auth/schemas/auth'
import { login } from '@/features/auth/server'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import TurnstileField from '@/shared/turnstile/TurnstileField'
import { Button } from '@/shared/ui/button'
import AuthField from './AuthField'
import { OAuthButton } from './OAuthButton'

interface LoginFormProps {
  nextPath?: string
  onAuthSuccess?: () => Promise<void> | void
}

const LoginForm = ({
  nextPath = '/groups',
  onAuthSuccess,
}: LoginFormProps) => {
  const turnstileRef = useRef<TurnstileFieldHandle>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  })
  const loginFn = useServerFn(login)
  const [isPending, startTransition] = useTransition()
  const navigate = useNavigate()
  const router = useRouter()

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
          await onAuthSuccess?.()
          await router.invalidate()
          toast.success(result.message)
          await navigate({ href: sanitizeRedirectPath(nextPath, '/groups') })
        }
        else {
          turnstileRef.current?.reset()
          if (result.code === TURNSTILE_ERROR_CODES.failed || result.code === TURNSTILE_ERROR_CODES.required) {
            turnstileRef.current?.requireInteractiveChallenge(result.message)
          }
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
    toast.warning('Not implemented yet.')
  }

  return (
    <div className="space-y-5">
      <OAuthButton nextPath={nextPath} />

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
        />

        {errors.root && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.root.message}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleForgotPassword}
            className="px-0 h-auto font-normal text-xs text-muted-foreground hover:text-foreground"
          >
            Forgot password?
          </Button>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-xl text-sm font-semibold"
          disabled={!isValid || isPending}
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
