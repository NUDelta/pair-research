import { getCookies } from '@tanstack/react-start/server'
import { TURNSTILE_E2E_BYPASS_COOKIE_NAME, TURNSTILE_E2E_BYPASS_COOKIE_VALUE } from './constants'

export function isTurnstileVerificationBypassed() {
  return getCookies()[TURNSTILE_E2E_BYPASS_COOKIE_NAME] === TURNSTILE_E2E_BYPASS_COOKIE_VALUE
}
