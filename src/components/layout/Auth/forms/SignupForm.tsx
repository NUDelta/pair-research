'use client'

import type { SignupValues } from '@/lib/validators/auth'
import { Spinner } from '@/components/common'
import { Button } from '@/components/ui/button'
import { signup } from '@/lib/actions/auth'
import { signupSchema } from '@/lib/validators/auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { redirect } from 'next/navigation'
import { useTransition } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AuthField from '../components/AuthField'
import { OAuthButton } from '../components/OAuthButton'

export function SignupForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: { name: '', email: '', password: '' },
  })
  const [isPending, startTransition] = useTransition()

  const onSubmit = async (values: SignupValues) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', values.email)
      formData.append('password', values.password)
      formData.append('name', values.name)
      const result = await signup(formData)
      if (result.success) {
        toast.warning(result.message)
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
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <AuthField
          id="name"
          label="Name"
          type="text"
          autocomplete="name"
          error={errors.name}
          register={register}
        />
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
          autocomplete="new-password"
          error={errors.password}
          register={register}
        />
        <Button type="submit" className="w-full" disabled={!isValid || isPending}>
          {isPending
            ? (
                <Spinner text="Signing up..." />
              )
            : 'Sign Up'}
        </Button>
      </form>
    </>
  )
}
