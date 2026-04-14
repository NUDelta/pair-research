import type { TurnstileAwareActionResponse } from '@/shared/turnstile/constants'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { loginSchema } from '@/features/auth/schemas/auth'
import { buildResetPasswordHref } from '@/features/auth/schemas/authSearch'
import { SITE_BASE_URL } from '@/shared/config/constants'
import { createClient } from '@/shared/supabase/server'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { isTurnstileVerificationBypassed } from '@/shared/turnstile/serverBypass'

const requestPasswordResetSchema = loginSchema.pick({ email: true })
  .merge(turnstileTokenSchema)
  .extend({
    nextPath: z.string().optional(),
  })

export const requestPasswordReset = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => requestPasswordResetSchema.parse(data))
  .handler(async ({ data }): Promise<TurnstileAwareActionResponse> => {
    const turnstile = await verifyTurnstileToken({
      action: 'forgot-password',
      skipVerification: isTurnstileVerificationBypassed(),
      token: data.turnstileToken,
    })

    if (!turnstile.success) {
      return createTurnstileErrorResponse(
        turnstile.message,
        turnstile.code ?? TURNSTILE_ERROR_CODES.failed,
      )
    }

    const trimmedEmail = data.email.trim()
    const nextPath = sanitizeRedirectPath(data.nextPath, '/groups')
    const supabase = await createClient()
    const redirectTo = SITE_BASE_URL !== ''
      ? new URL(buildResetPasswordHref({ nextPath, recovery: true }), SITE_BASE_URL).toString()
      : undefined

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo,
    })

    if (error) {
      console.error('Password reset request failed:', error)
      return {
        success: false,
        message: 'We could not send the reset email right now. Please try again.',
      }
    }

    return {
      success: true,
      message: 'If an account exists for that email, we sent a password reset link.',
    }
  })
