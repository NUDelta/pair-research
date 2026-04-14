export const AUTH_FEEDBACK_SOURCES = ['auth-callback', 'auth-confirm'] as const

export type AuthFeedbackSource = (typeof AUTH_FEEDBACK_SOURCES)[number]

export function isAuthFeedbackSource(value: string | null | undefined): value is AuthFeedbackSource {
  return value !== null
    && value !== undefined
    && AUTH_FEEDBACK_SOURCES.includes(value as AuthFeedbackSource)
}
