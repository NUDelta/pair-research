import { describe, expect, it } from 'vitest'
import { TURNSTILE_E2E_BYPASS_COOKIE_NAME, TURNSTILE_E2E_BYPASS_COOKIE_VALUE } from './constants'
import { isTurnstileVerificationBypassedForCookies } from './serverBypass'

describe('isTurnstileVerificationBypassed', () => {
  it('does not bypass verification with only the public e2e cookie', async () => {
    expect(isTurnstileVerificationBypassedForCookies({
      [TURNSTILE_E2E_BYPASS_COOKIE_NAME]: TURNSTILE_E2E_BYPASS_COOKIE_VALUE,
    }, undefined)).toBe(false)
  })

  it('bypasses verification only when the server-side e2e flag is enabled', async () => {
    expect(isTurnstileVerificationBypassedForCookies({
      [TURNSTILE_E2E_BYPASS_COOKIE_NAME]: TURNSTILE_E2E_BYPASS_COOKIE_VALUE,
    }, '1')).toBe(true)
  })

  it('does not bypass verification when the e2e cookie has the wrong value', async () => {
    expect(isTurnstileVerificationBypassedForCookies({
      [TURNSTILE_E2E_BYPASS_COOKIE_NAME]: 'wrong-value',
    }, '1')).toBe(false)
  })
})
