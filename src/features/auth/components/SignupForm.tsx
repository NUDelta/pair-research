import type { SignupFormValues } from '@/features/auth/schemas/auth'
import type { TurnstileFieldHandle } from '@/shared/turnstile/TurnstileField'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CheckCircle2, LoaderCircle, Mail } from 'lucide-react'
import { useRef, useState, useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { signupFormSchema } from '@/features/auth/schemas/auth'
import { signup } from '@/features/auth/server'
import { TURNSTILE_ERROR_CODES } from '@/shared/turnstile/constants'
import TurnstileField from '@/shared/turnstile/TurnstileField'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import AuthField from './AuthField'
import { OAuthButton } from './OAuthButton'

interface SignupFormProps {
  loginHref?: string
  nextPath?: string
  onAuthSuccess?: () => Promise<void> | void
}

type SignupFormInput = SignupFormValues & {
  agreeToTerms?: boolean
}

const SignupForm = ({
  loginHref = '/login',
  nextPath = '/groups',
  onAuthSuccess,
}: SignupFormProps) => {
  const turnstileRef = useRef<TurnstileFieldHandle>(null)
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
      email: '',
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
      <div className="space-y-5 rounded-[1.75rem] border border-emerald-200/80 bg-emerald-50/90 p-5 text-slate-900">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-500/12 p-3 text-emerald-700">
            <CheckCircle2 className="size-5" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Check your inbox
            </h3>
            <p className="text-sm leading-6 text-slate-700">
              We sent a confirmation link to
              {' '}
              <span className="font-semibold">{pendingConfirmationEmail}</span>
              . Confirm your email, then come back to sign in.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white/70 p-4 text-sm leading-6 text-slate-700">
          <div className="flex items-center gap-2 font-medium text-slate-900">
            <Mail className="size-4 text-emerald-700" aria-hidden="true" />
            Next step
          </div>
          <p className="mt-2">
            If the message does not show up in a minute, check spam or retry sign up with the same email.
          </p>
        </div>

        <Button asChild className="h-12 w-full rounded-xl text-sm font-semibold">
          <a href={loginHref}>
            Go to sign in
          </a>
        </Button>
      </div>
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
          <div className="space-y-1 leading-none">
            <Label htmlFor="agreeToTerms" className="text-sm font-normal cursor-pointer">
              I agree to the
              {' '}
              <button
                type="button"
                className="underline hover:text-foreground transition-colors"
              >
                Terms of Service
              </button>
              {' '}
              and
              {' '}
              <button
                type="button"
                className="underline hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
            </Label>
          </div>
        </div>

        <TurnstileField
          controllerRef={turnstileRef}
          action="signup"
          mode="visible"
          description="Complete the security check before creating your account."
        />

        {errors.root && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.root.message}
          </div>
        )}

        <Button
          type="submit"
          className="h-12 w-full rounded-xl text-sm font-semibold"
          disabled={!isValid || !agreeToTerms || isPending}
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
