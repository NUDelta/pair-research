export const E2E_AUTH_COOKIE_NAME = 'pair-research-e2e-auth'
export const E2E_AUTH_ANONYMOUS_MODE = 'anonymous'

function readCookieValue(cookieHeader: string, name: string) {
  const cookie = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))

  if (cookie === undefined) {
    return null
  }

  return decodeURIComponent(cookie.slice(name.length + 1))
}

export function getBrowserE2EAuthMode() {
  if (typeof document === 'undefined') {
    return null
  }

  return readCookieValue(document.cookie, E2E_AUTH_COOKIE_NAME)
}

export function isE2EAnonymousAuthMode(mode: string | null | undefined) {
  return mode === E2E_AUTH_ANONYMOUS_MODE
}

export function isMissingSupabaseSessionError(error: { name?: string | null, message?: string | null } | null | undefined) {
  return error?.name === 'AuthSessionMissingError'
    || error?.message === 'Auth session missing!'
}
