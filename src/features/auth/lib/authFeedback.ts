export const AUTH_FEEDBACK_SOURCES = ['auth-callback', 'auth-confirm', 'auth-login'] as const
export const AUTH_ERROR_CODES = ['auth-callback-failed', 'auth-confirm-failed'] as const

export type AuthFeedbackSource = (typeof AUTH_FEEDBACK_SOURCES)[number]
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number]

export function isAuthFeedbackSource(value: string | null | undefined): value is AuthFeedbackSource {
  return value !== null
    && value !== undefined
    && AUTH_FEEDBACK_SOURCES.includes(value as AuthFeedbackSource)
}

export function getAuthErrorMessage(value: string | null | undefined) {
  if (value === 'auth-confirm-failed') {
    return 'Email verification failed. Please request a new link and try again.'
  }

  if (value === 'auth-callback-failed') {
    return 'Authentication failed. Please sign in again.'
  }

  return 'Authentication failed. Please try again.'
}
