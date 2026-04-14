import type { SignupFormValues } from '@/features/auth/schemas/auth'
import type { TurnstileFieldHandle } from '@/shared/turnstile/TurnstileField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { LoaderCircle } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { signupFormSchema } from '@/features/auth/schemas/auth'
import { buildAuthPageHref } from '@/features/auth/schemas/authSearch'
import { signup } from '@/features/auth/server'
import { buildLegalPageHref } from '@/features/legal/lib/legalLinks'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import TurnstileField from '@/shared/turnstile/TurnstileField'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import AuthEmailStatusNotice from './AuthEmailStatusNotice'
import AuthField from './AuthField'
import { OAuthButton } from './OAuthButton'

interface SignupFormProps {
  defaultEmail?: string
  nextPath?: string
  onAuthSuccess?: () => Promise<void> | void
}

type SignupFormInput = SignupFormValues & {
  agreeToTerms?: boolean
}

const SignupForm = ({
  defaultEmail = '',
  nextPath = '/groups',
  onAuthSuccess,
}: SignupFormProps) => {
  const turnstileRef = useRef<TurnstileFieldHandle>(null)
  const [isTurnstileVerified, setIsTurnstileVerified] = useState(false)
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    watch,
    setValue,
    reset,
  } = useForm<SignupFormInput>({
    resolver: zodResolver(signupFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: defaultEmail,
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  })
  const signupFn = useServerFn(signup)
  const [isPending, startTransition] = useTransition()
  const navigate = useNavigate()
  const router = useRouter()

  const agreeToTerms = watch('agreeToTerms')

  const onSubmit = async ({ agreeToTerms: _agreeToTerms, confirmPassword: _confirmPassword, ...values }: SignupFormInput) => {
    if (!agreeToTerms) {
      setError('root', { message: 'You must agree to the terms and conditions' })
      return
    }

    const turnstileToken = await turnstileRef.current?.ensureToken()
    if (turnstileToken == null || turnstileToken === '') {
      setError('root', { message: 'Please complete the security check to continue.' })
      return
    }

    startTransition(async () => {
      try {
        const result = await signupFn({
          data: {
            ...values,
            nextPath,
            turnstileToken,
          },
        })
        if (result.success) {
          if (result.sessionEstablished === true) {
            await onAuthSuccess?.()
            await router.invalidate()
            toast.success(result.message)
            await navigate({ href: sanitizeRedirectPath(nextPath, '/groups') })
            return
          }

          toast.warning(result.message)
          setPendingConfirmationEmail(values.email.trim())
          reset({
            name: '',
            email: values.email.trim(),
            password: '',
            confirmPassword: '',
            agreeToTerms: false,
          })
          turnstileRef.current?.reset()
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
        const errorMessage = error instanceof Error ? error.message : 'Sign up failed'
        toast.error(errorMessage)
        setError('root', { message: errorMessage })
      }
    })
  }

  if (pendingConfirmationEmail !== null) {
    return (
      <AuthEmailStatusNotice
        actionHref={buildAuthPageHref('/login', {
          email: pendingConfirmationEmail,
          nextPath,
          notice: 'check-email',
        })}
        actionLabel="Go to sign in"
        email={pendingConfirmationEmail}
        variant="check-email"
      />
    )
  }

  return (
    <div className="space-y-5">
      <OAuthButton nextPath={nextPath} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <AuthField
          id="name"
          label="Full Name"
          type="text"
          autocomplete="name"
          placeholder="Enter your full name"
          error={errors.name}
          register={register}
        />

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
          autocomplete="new-password"
          placeholder="Create a strong password"
          error={errors.password}
          register={register}
        />

        <AuthField
          id="confirmPassword"
          label="Confirm Password"
          type="password"
          autocomplete="new-password"
          placeholder="Re-enter your password"
          error={errors.confirmPassword}
          register={register}
        />

        <div className="flex items-start space-x-3 space-y-0">
          <Checkbox
            id="agreeToTerms"
            checked={agreeToTerms}
            onCheckedChange={checked => setValue('agreeToTerms', checked === true)}
            className="mt-1"
          />
          <div className="space-y-2 leading-none">
            <Label htmlFor="agreeToTerms" className="text-sm font-normal cursor-pointer">
              I agree to the Terms of Service and Privacy Policy.
            </Label>
            <p className="text-sm leading-6 text-muted-foreground">
              Read the
              {' '}
              <a
                href={buildLegalPageHref('/terms', 'signup')}
                className="underline hover:text-foreground transition-colors"
              >
                Terms of Service
              </a>
              {' '}
              and
              {' '}
              <a
                href={buildLegalPageHref('/privacy', 'signup')}
                className="underline hover:text-foreground transition-colors"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>

        <TurnstileField
          controllerRef={turnstileRef}
          action="signup"
          mode="visible"
          description="Complete the security check before creating your account."
          onVerifiedChange={setIsTurnstileVerified}
        />

        {errors.root && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.root.message}
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full rounded-xl text-sm font-semibold"
          disabled={!isValid || !agreeToTerms || !isTurnstileVerified || isPending}
        >
          {isPending
            ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Verifying and creating account...
                </>
              )
            : (
                'Create Account'
              )}
        </Button>
      </form>
    </div>
  )
}

export default SignupForm
