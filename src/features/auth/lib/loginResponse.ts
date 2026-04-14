import type { TurnstileErrorCode } from '@/shared/turnstile/constants'

export const LOGIN_ERROR_CODES = {
  emailNotConfirmed: 'email-not-confirmed',
} as const

export type LoginErrorCode
  = | TurnstileErrorCode
    | (typeof LOGIN_ERROR_CODES)[keyof typeof LOGIN_ERROR_CODES]

export interface LoginResponse extends ActionResponse {
  code?: LoginErrorCode
}
