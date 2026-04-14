import type { TurnstileServerValidationResponse } from '@marsidev/react-turnstile'
import type { TurnstileAwareActionResponse } from './constants'
import { z } from 'zod'
import {
  TURNSTILE_ERROR_CODES,

} from './constants'

const secretSchema = z.string().trim().min(1)

interface VerifyTurnstileTokenInput {
  action: string
  skipVerification?: boolean
  token: string
}

interface VerifyTurnstileTokenResult {
  success: boolean
  interactive: boolean
  message: string
  code?: TurnstileAwareActionResponse['code']
  errors: string[]
}

function getTurnstileSecretKey() {
  const secret = secretSchema.safeParse(process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ?? '')
  return secret.success ? secret.data : ''
}

export function createTurnstileErrorResponse(message: string, code: TurnstileAwareActionResponse['code']): TurnstileAwareActionResponse {
  return {
    success: false,
    message,
    code,
  }
}

export async function verifyTurnstileToken({
  action,
  skipVerification = false,
  token,
}: VerifyTurnstileTokenInput): Promise<VerifyTurnstileTokenResult> {
  if (skipVerification) {
    return {
      success: true,
      interactive: false,
      message: 'Turnstile bypassed for e2e automation.',
      errors: [],
    }
  }

  const secret = getTurnstileSecretKey()
  if (secret === '') {
    return {
      success: false,
      interactive: true,
      message: 'Security verification is unavailable right now. Please try again in a moment.',
      code: TURNSTILE_ERROR_CODES.unavailable,
      errors: ['missing-input-secret'],
    }
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      secret,
      response: token,
    }),
  })

  if (!response.ok) {
    return {
      success: false,
      interactive: true,
      message: 'We could not confirm the security check. Please try again.',
      code: TURNSTILE_ERROR_CODES.failed,
      errors: [`http-${response.status}`],
    }
  }

  const payload = await response.json() as TurnstileServerValidationResponse
  const actionMismatch = payload.action !== undefined && payload.action !== action

  if (!payload.success || actionMismatch) {
    return {
      success: false,
      interactive: payload.metadata?.interactive ?? true,
      message: actionMismatch
        ? 'Security check expired. Please verify again.'
        : 'Please complete the security check and try again.',
      code: TURNSTILE_ERROR_CODES.failed,
      errors: actionMismatch ? ['action-mismatch'] : payload['error-codes'],
    }
  }

  return {
    success: true,
    interactive: payload.metadata?.interactive ?? false,
    message: 'Security check passed.',
    errors: [],
  }
}
