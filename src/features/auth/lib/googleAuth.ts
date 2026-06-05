import { sanitizeRedirectPath } from './authRedirect'

interface GoogleOAuthClient {
  auth: {
    signInWithOAuth: (args: {
      provider: 'google'
      options: {
        redirectTo: string
      }
    }) => Promise<{ error: { message: string } | null }>
    signInWithIdToken: (args: {
      provider: 'google'
      token: string
      nonce?: string
    }) => Promise<{ error: { message: string } | null }>
  }
}

export const GOOGLE_AUTH_REDIRECT_SOURCE = 'auth-login'

export function buildGoogleAuthCallbackUrl(nextPath: string, origin: string) {
  const redirectTo = new URL('/auth/callback', origin)
  redirectTo.searchParams.set('next', sanitizeRedirectPath(nextPath, '/groups'))

  return redirectTo.toString()
}

export function buildPostGoogleAuthRedirectUrl(nextPath: string, origin: string) {
  const redirectUrl = new URL(sanitizeRedirectPath(nextPath, '/groups'), origin)
  redirectUrl.searchParams.set('from', GOOGLE_AUTH_REDIRECT_SOURCE)

  return redirectUrl.toString()
}

export async function startGoogleOAuth(
  authClient: GoogleOAuthClient,
  nextPath: string,
  origin: string,
) {
  return authClient.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: buildGoogleAuthCallbackUrl(nextPath, origin),
    },
  })
}

export async function signInWithGoogleIdToken(
  authClient: GoogleOAuthClient,
  credential: string,
  nonce?: string,
) {
  return authClient.auth.signInWithIdToken({
    provider: 'google',
    token: credential,
    ...(nonce === undefined ? {} : { nonce }),
  })
}
