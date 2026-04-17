import { describe, expect, it } from 'vitest'
import { isAuthFeedbackSource } from './authFeedback'

describe('isAuthFeedbackSource', () => {
  it('accepts auth callback markers owned by the auth flow', () => {
    expect(isAuthFeedbackSource('auth-callback')).toBe(true)
    expect(isAuthFeedbackSource('auth-confirm')).toBe(true)
    expect(isAuthFeedbackSource('auth-login')).toBe(true)
  })

  it('rejects unrelated route context markers', () => {
    expect(isAuthFeedbackSource('signup')).toBe(false)
    expect(isAuthFeedbackSource('account')).toBe(false)
    expect(isAuthFeedbackSource(null)).toBe(false)
  })
})
