import type { TurnstileAwareActionResponse } from '@/shared/turnstile/constants'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { gravatarLink } from '@/features/auth/lib'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { signupSchema } from '@/features/auth/schemas/auth'
import { SITE_BASE_URL } from '@/shared/config/constants'
import { createClient } from '@/shared/supabase/server'
import { TURNSTILE_ERROR_CODES, turnstileTokenSchema } from '@/shared/turnstile/constants'
import { createTurnstileErrorResponse, verifyTurnstileToken } from '@/shared/turnstile/server'
import { isTurnstileVerificationBypassed } from '@/shared/turnstile/serverBypass'

const signupRequestSchema = signupSchema
  .merge(turnstileTokenSchema)
  .extend({
    nextPath: z.string().optional(),
  })

type SignupResponse = TurnstileAwareActionResponse & {
  sessionEstablished?: boolean
}

export const signup = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => signupRequestSchema.parse(data))
  .handler(async ({ data }): Promise<SignupResponse> => {
    const turnstile = await verifyTurnstileToken({
      action: 'signup',
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
    const trimmedName = data.name.trim()
    const trimmedEmail = data.email.trim()

    const gravatarUrl = await gravatarLink(trimmedEmail, trimmedName)
    const nextPath = sanitizeRedirectPath(data.nextPath, '/groups')

    const emailRedirectTo = SITE_BASE_URL !== ''
      ? new URL(`/auth/confirm?next=${encodeURIComponent(nextPath)}`, SITE_BASE_URL).toString()
      : undefined

    const { data: authData, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: data.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: trimmedName,
          avatar_url: gravatarUrl,
        },
      },
    })
    const { user, session } = authData

    if (error) {
      console.error('Signup error:', error)

      return {
        success: false,
        message: error.code as string ?? 'Unexpected Error',
      }
    }

    if (!user) {
      return { success: false, message: 'Unexpected Error' }
    }

    return {
      success: true,
      message: session !== null
        ? `Welcome ${trimmedName}!`
        : `Welcome ${trimmedName}!\nCheck your email to confirm your account.`,
      sessionEstablished: session !== null,
    }
  })
