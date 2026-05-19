import { describe, expect, it, vi } from 'vitest'
import {
  buildGoogleAuthCallbackUrl,
  buildPostGoogleAuthRedirectUrl,
  startGoogleOAuth,
} from './googleAuth'

describe('googleAuth', () => {
  it('builds sanitized OAuth callback URLs', () => {
    expect(buildGoogleAuthCallbackUrl('/groups?view=mine', 'https://pairresearch.io')).toBe(
      'https://pairresearch.io/auth/callback?next=%2Fgroups%3Fview%3Dmine',
    )

    expect(buildGoogleAuthCallbackUrl('https://evil.example/groups', 'https://pairresearch.io')).toBe(
      'https://pairresearch.io/auth/callback?next=%2Fgroups',
    )
  })

  it('builds sanitized post-auth redirect URLs with the auth source marker', () => {
    expect(buildPostGoogleAuthRedirectUrl('/groups/demo', 'https://pairresearch.io')).toBe(
      'https://pairresearch.io/groups/demo?from=auth-login',
    )
  })

  it('starts Google OAuth with the same callback route used by existing auth flow', async () => {
    const signInWithOAuth = vi.fn(async () => ({ error: null }))
    const authClient = {
      auth: {
        signInWithOAuth,
        signInWithIdToken: vi.fn(),
      },
    }

    await startGoogleOAuth(authClient, '/groups/demo', 'https://pairresearch.io')

    expect(signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://pairresearch.io/auth/callback?next=%2Fgroups%2Fdemo',
      },
    })
  })
})
