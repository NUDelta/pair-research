import { z } from 'zod'

export const turnstileTokenSchema = z.object({
  turnstileToken: z
    .string()
    .trim()
    .min(1, 'Please complete the security check'),
})

export type TurnstileTokenValues = z.infer<typeof turnstileTokenSchema>

export const TURNSTILE_ERROR_CODES = {
  failed: 'turnstile-failed',
  required: 'turnstile-required',
  unavailable: 'turnstile-unavailable',
} as const

export type TurnstileErrorCode = (typeof TURNSTILE_ERROR_CODES)[keyof typeof TURNSTILE_ERROR_CODES]

export interface TurnstileAwareActionResponse extends ActionResponse {
  code?: TurnstileErrorCode
}

export const TURNSTILE_TOKEN_TIMEOUT_MS = 12_000
