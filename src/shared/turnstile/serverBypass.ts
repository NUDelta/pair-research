import { getCookies } from '@tanstack/react-start/server'
import { TURNSTILE_E2E_BYPASS_COOKIE_NAME, TURNSTILE_E2E_BYPASS_COOKIE_VALUE } from './constants'

const E2E_TURNSTILE_BYPASS_ENABLED = '1'

/**
 * Allows local Playwright runs to bypass Turnstile only when the server process
 * has explicitly opted in. The cookie value is public test plumbing and must not
 * be enough on its own in deployed environments.
 */
export function isTurnstileVerificationBypassedForCookies(
  cookies: Record<string, string | undefined>,
  e2eBypassFlag = process.env.PAIR_RESEARCH_ENABLE_E2E_TURNSTILE_BYPASS,
) {
  return e2eBypassFlag === E2E_TURNSTILE_BYPASS_ENABLED
    && cookies[TURNSTILE_E2E_BYPASS_COOKIE_NAME] === TURNSTILE_E2E_BYPASS_COOKIE_VALUE
}

export function isTurnstileVerificationBypassed() {
  return isTurnstileVerificationBypassedForCookies(getCookies())
}
