import type { LoginResponse } from '@/features/auth/lib/loginResponse'
import { createServerFn } from '@tanstack/react-start'
import { LOGIN_ERROR_CODES } from '@/features/auth/lib/loginResponse'
import { loginSchema } from '@/features/auth/schemas/auth'
import { createClient } from '@/shared/supabase/server'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { isTurnstileVerificationBypassed } from '@/shared/turnstile/serverBypass'

const loginRequestSchema = loginSchema.merge(turnstileTokenSchema)

export const login = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => loginRequestSchema.parse(data))
  .handler(async ({ data }): Promise<LoginResponse> => {
    const turnstile = await verifyTurnstileToken({
      action: 'login',
      skipVerification: isTurnstileVerificationBypassed(),
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
      const normalizedMessage = error.message.toLowerCase()
      const emailNotConfirmed = error.code === 'email_not_confirmed'
        || normalizedMessage.includes('email not confirmed')

      return {
        success: false,
        message: error.message,
        code: emailNotConfirmed ? LOGIN_ERROR_CODES.emailNotConfirmed : undefined,
      }
    }

    return { success: true, message: 'Login successful' }
  })
