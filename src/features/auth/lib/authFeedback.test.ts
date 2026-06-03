import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage, isAuthFeedbackSource } from './authFeedback'

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

  it('maps stable auth error codes to safe user messages', () => {
    expect(getAuthErrorMessage('auth-callback-failed')).toBe('Authentication failed. Please sign in again.')
    expect(getAuthErrorMessage('auth-confirm-failed')).toBe('Email verification failed. Please request a new link and try again.')
    expect(getAuthErrorMessage('raw provider message')).toBe('Authentication failed. Please try again.')
  })
})
