import type { LoginResponse } from '@/features/auth/lib/loginResponse'
import { createServerFn } from '@tanstack/react-start'
import { LOGIN_ERROR_CODES } from '@/features/auth/lib/loginResponse'
import { loginSchema } from '@/features/auth/schemas/auth'
import { createClient } from '@/shared/supabase/server'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'

const loginRequestSchema = loginSchema.merge(turnstileTokenSchema)
const LOGIN_FAILED_MESSAGE = 'Invalid email or password.'

export function getLoginFailureResponse(error: { code?: string, message: string }): LoginResponse {
  const normalizedMessage = error.message.toLowerCase()
  const emailNotConfirmed = error.code === 'email_not_confirmed'
    || normalizedMessage.includes('email not confirmed')

  if (emailNotConfirmed) {
    return {
      success: false,
      message: 'Confirm your email to finish signing in.',
      code: LOGIN_ERROR_CODES.emailNotConfirmed,
    }
  }

  return {
    success: false,
    message: LOGIN_FAILED_MESSAGE,
  }
}

export const login = createServerFn({ method: 'POST' })
  .validator((data: unknown) => loginRequestSchema.parse(data))
  .handler(async ({ data }): Promise<LoginResponse> => {
    const turnstile = await verifyTurnstileToken({
      action: 'login',
      token: data.turnstileToken,
    })

    if (!turnstile.success) {
      return createTurnstileErrorResponse(
        turnstile.message,
        turnstile.code ?? TURNSTILE_ERROR_CODES.failed,
      )
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      return getLoginFailureResponse(error)
    }

    return { success: true, message: 'Login successful' }
  })
