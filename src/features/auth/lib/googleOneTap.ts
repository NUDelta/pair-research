import { sanitizeRedirectPath } from './authRedirect'

const ONE_TAP_PUBLIC_PATHS = new Set(['/', '/login', '/signup'])

export function shouldShowGoogleOneTap(pathname: string) {
  return ONE_TAP_PUBLIC_PATHS.has(pathname)
}

export function getGoogleOneTapNextPath(location: Pick<Location, 'pathname' | 'search'>) {
  const searchParams = new URLSearchParams(location.search)
  const nextPath = searchParams.get('next')

  if (nextPath !== null) {
    return sanitizeRedirectPath(nextPath, '/groups')
  }

  return '/groups'
}
