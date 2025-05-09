'use client'

import type { LoginValues } from '@/lib/validators/auth'
import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { login } from '@/lib/actions/auth'
import { loginSchema } from '@/lib/validators/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { redirect } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AuthField from '../components/AuthField'
import { OAuthButton } from '../components/OAuthButton'

const LoginForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
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
      const result = await login(formData)
      if (result.success) {
        toast.success(result.message)
        redirect('/')
      }
      else {
        toast.error(result.message)
      }
    })
  }

  return (
    <>
      <OAuthButton />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 pb-4">
        <AuthField
          id="email"
          label="Email"
          type="email"
          autocomplete="email"
          error={errors.email}
          register={register}
        />
        <AuthField
          id="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          error={errors.password}
          register={register}
        />
        <Button type="submit" className="w-full" disabled={!isValid || isPending}>
          {isPending
            ? (
                <Spinner text="Logging in..." />
              )
            : 'Login'}
        </Button>
      </form>
    </>
  )
}

export default LoginForm
