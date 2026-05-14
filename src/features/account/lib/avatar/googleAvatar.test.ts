import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { getGoogleAvatarUrlForUser, isGoogleAvatarUrl, normalizeGoogleAvatarUrl } from './googleAvatar'

function buildUser(overrides: Partial<User>): User {
  return {
    id: 'user-1',
    app_metadata: {},
    aud: 'authenticated',
    confirmation_sent_at: undefined,
    created_at: '2026-04-16T00:00:00.000Z',
    email: 'person@example.com',
    factors: [],
    identities: [],
    is_anonymous: false,
    last_sign_in_at: undefined,
    phone: '',
    role: 'authenticated',
    updated_at: '2026-04-16T00:00:00.000Z',
    user_metadata: {},
    ...overrides,
  }
}

describe('googleAvatar', () => {
  it('recognizes googleusercontent avatar URLs', () => {
    expect(isGoogleAvatarUrl('https://lh3.googleusercontent.com/a/abc=s96-c')).toBe(true)
    expect(isGoogleAvatarUrl('https://example.com/avatar.png')).toBe(false)
  })

  it('normalizes Google photo sizing to a higher-resolution crop', () => {
    expect(
      normalizeGoogleAvatarUrl('https://lh3.googleusercontent.com/a/abc=s96-c'),
    ).toBe('https://lh3.googleusercontent.com/a/abc=s512-c')

    expect(
      normalizeGoogleAvatarUrl('https://lh3.googleusercontent.com/a/abc'),
    ).toBe('https://lh3.googleusercontent.com/a/abc=s512-c')
  })

  it('returns a Google avatar only for users with a Google identity', () => {
    const user = buildUser({
      app_metadata: { provider: 'google', providers: ['google'] },
      identities: [{ provider: 'google' }] as User['identities'],
      user_metadata: {
        avatar_url: 'https://lh3.googleusercontent.com/a/abc=s96-c',
      },
    })

    expect(getGoogleAvatarUrlForUser(user)).toBe('https://lh3.googleusercontent.com/a/abc=s96-c')
  })

  it('ignores non-Google providers even if the metadata value is present', () => {
    const user = buildUser({
      app_metadata: { provider: 'email', providers: ['email'] },
      identities: [{ provider: 'email' }] as User['identities'],
      user_metadata: {
        avatar_url: 'https://lh3.googleusercontent.com/a/abc=s96-c',
      },
    })

    expect(getGoogleAvatarUrlForUser(user)).toBeNull()
  })
})
