import { describe, expect, it } from 'vitest'
import { LOGIN_ERROR_CODES } from '@/features/auth/lib/loginResponse'
import { getLoginFailureResponse } from './login'

describe('getLoginFailureResponse', () => {
  it('does not return raw provider errors for ordinary login failures', () => {
    expect(getLoginFailureResponse({
      message: 'Invalid login credentials',
    })).toEqual({
      success: false,
      message: 'Invalid email or password.',
    })
  })

  it('keeps the email confirmation code with a sanitized message', () => {
    expect(getLoginFailureResponse({
      code: 'email_not_confirmed',
      message: 'Email not confirmed',
    })).toEqual({
      success: false,
      message: 'Confirm your email to finish signing in.',
      code: LOGIN_ERROR_CODES.emailNotConfirmed,
    })
  })
})
