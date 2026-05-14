import type { User } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { getAuthProfileSnapshot } from './authProfile'

function buildUser(userMetadata: Record<string, unknown>): User {
  return {
    id: 'user-1',
    app_metadata: {},
    aud: 'authenticated',
    confirmation_sent_at: undefined,
    created_at: '2026-04-14T00:00:00.000Z',
    email: 'person@example.com',
    factors: [],
    identities: [],
    is_anonymous: false,
    last_sign_in_at: undefined,
    phone: '',
    role: 'authenticated',
    updated_at: '2026-04-14T00:00:00.000Z',
    user_metadata: userMetadata,
  }
}

describe('getAuthProfileSnapshot', () => {
  it('keeps trimmed metadata values', () => {
    expect(getAuthProfileSnapshot(buildUser({
      full_name: '  Test User  ',
      avatar_url: ' https://example.com/avatar.png ',
    }))).toEqual({
      full_name: 'Test User',
      avatar_url: 'https://example.com/avatar.png',
    })
  })

  it('falls back to null when metadata is missing', () => {
    expect(getAuthProfileSnapshot(buildUser({}))).toEqual({
      full_name: null,
      avatar_url: null,
    })
  })
})
