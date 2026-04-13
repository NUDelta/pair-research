import type { SignupValues } from '@/features/auth/schemas/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { LoaderCircle } from 'lucide-react'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { signupSchema } from '@/features/auth/schemas/auth'
import { signup } from '@/features/auth/server'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import AuthField from './AuthField'
import { OAuthButton } from './OAuthButton'

interface SignupFormProps {
  toggleOpen: () => void
  onAuthSuccess?: () => Promise<void> | void
}

const SignupForm = ({
  toggleOpen,
  onAuthSuccess,
}: SignupFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    setError,
    watch,
    setValue,
  } = useForm<SignupValues & { agreeToTerms?: boolean }>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
      agreeToTerms: false,
    },
  })
  const signupFn = useServerFn(signup)
  const [isPending, startTransition] = useTransition()
  const navigate = useNavigate()
  const router = useRouter()

  const agreeToTerms = watch('agreeToTerms')

  const onSubmit = async (values: SignupValues) => {
    if (!agreeToTerms) {
      setError('root', { message: 'You must agree to the terms and conditions' })
      return
    }

    startTransition(async () => {
      try {
        const result = await signupFn({ data: values })
        if (result.success) {
          if (result.sessionEstablished === true) {
            const redirectPath = sanitizeRedirectPath(
              new URL(globalThis.location.href).searchParams.get('next'),
              '/groups',
            )

            await onAuthSuccess?.()
            await router.invalidate()
            toast.success(result.message)
            toggleOpen()
            await navigate({ href: redirectPath })
            return
          }

          toast.warning(result.message)
          toggleOpen()
        }
        else {
          toast.error(result.message)
          setError('root', { message: result.message })
        }
      }
      catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Sign up failed'
        toast.error(errorMessage)
        setError('root', { message: errorMessage })
      }
    })
  }

  return (
    <div className="space-y-4">
      <OAuthButton />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

        {errors.root && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
            {errors.root.message}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11"
          disabled={!isValid || !agreeToTerms || isPending}
        >
          {isPending
            ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Creating account...
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
