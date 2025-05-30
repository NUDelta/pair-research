'use client'

import type { LoginValues } from '@/lib/validators/auth'
import { Button } from '@/components/ui/button'
import { login } from '@/lib/actions/auth'
import { loginSchema } from '@/lib/validators/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle } from 'lucide-react'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AuthField from '../components/AuthField'
import { OAuthButton } from '../components/OAuthButton'

interface LoginFormProps {
  toggleOpen: () => void
}

const LoginForm = ({
  toggleOpen,
}: LoginFormProps) => {
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
  const [isPending, startTransition] = useTransition()

  const onSubmit = async (values: LoginValues) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', values.email)
      formData.append('password', values.password)
      try {
        const result = await login(formData)
        if (result.success) {
          toast.success(result.message)
          toggleOpen()
        }
        else {
          toast.error(result.message)
          setError('root', { message: result.message })
        }
      }
      catch (error) {
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
    <div className="space-y-4">
      <OAuthButton />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          className="w-full h-11"
          disabled={!isValid || isPending}
        >
          {isPending
            ? (
                <>
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                  Signing in...
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
