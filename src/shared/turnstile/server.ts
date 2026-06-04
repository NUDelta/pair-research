import type { TurnstileServerValidationResponse } from '@marsidev/react-turnstile'
import type { TurnstileAwareActionResponse } from './constants'
import { z } from 'zod'
import { TURNSTILE_ERROR_CODES } from './constants'

const secretSchema = z.string().trim().min(1)
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const CANONICAL_ALLOWED_TURNSTILE_HOSTNAMES = ['pairresearch.io', 'www.pairresearch.io'] as const

interface VerifyTurnstileTokenInput {
  action: string
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

function getAllowedTurnstileHostnames() {
  const hostnames = new Set<string>(CANONICAL_ALLOWED_TURNSTILE_HOSTNAMES)

  try {
    const configuredSiteUrl = new URL(process.env.VITE_SITE_BASE_URL ?? '')
    hostnames.add(configuredSiteUrl.hostname)
  }
  catch {}

  return hostnames
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
  token,
}: VerifyTurnstileTokenInput): Promise<VerifyTurnstileTokenResult> {
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

  let response: Response
  try {
    response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret,
        response: token,
      }),
    })
  }
  catch (error) {
    console.error('[TURNSTILE_VERIFY_REQUEST_FAILED]', error)
    return {
      success: false,
      interactive: true,
      message: 'We could not confirm the security check. Please try again.',
      code: TURNSTILE_ERROR_CODES.failed,
      errors: ['request-failed'],
    }
  }

  if (!response.ok) {
    return {
      success: false,
      interactive: true,
      message: 'We could not confirm the security check. Please try again.',
      code: TURNSTILE_ERROR_CODES.failed,
      errors: [`http-${response.status}`],
    }
  }

  let payload: TurnstileServerValidationResponse
  try {
    payload = await response.json()
  }
  catch (error) {
    console.error('[TURNSTILE_VERIFY_RESPONSE_INVALID]', error)
    return {
      success: false,
      interactive: true,
      message: 'We could not confirm the security check. Please try again.',
      code: TURNSTILE_ERROR_CODES.failed,
      errors: ['invalid-response'],
    }
  }
  const actionMismatch = payload.action !== action
  const allowedHostnames = getAllowedTurnstileHostnames()
  const hostnameMismatch = payload.hostname === undefined || !allowedHostnames.has(payload.hostname)

  if (!payload.success || actionMismatch || hostnameMismatch) {
    return {
      success: false,
      interactive: payload.metadata?.interactive ?? true,
      message: actionMismatch || hostnameMismatch
        ? 'Security check expired. Please verify again.'
        : 'Please complete the security check and try again.',
      code: TURNSTILE_ERROR_CODES.failed,
      errors: actionMismatch
        ? ['action-mismatch']
        : hostnameMismatch
          ? ['hostname-mismatch']
          : payload['error-codes'],
    }
  }

  return {
    success: true,
    interactive: payload.metadata?.interactive ?? false,
    message: 'Security check passed.',
    errors: [],
  }
}
