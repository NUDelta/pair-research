import type { TurnstileAwareActionResponse } from '@/shared/turnstile/constants'
import { createServerFn } from '@tanstack/react-start'
import { loginSchema } from '@/features/auth/schemas/auth'
import { createClient } from '@/shared/supabase/server'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { isTurnstileVerificationBypassed } from '@/shared/turnstile/serverBypass'

const loginRequestSchema = loginSchema.merge(turnstileTokenSchema)

export const login = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => loginRequestSchema.parse(data))
  .handler(async ({ data }): Promise<TurnstileAwareActionResponse> => {
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
      return { success: false, message: error.message }
    }

    return { success: true, message: 'Login successful' }
  })
