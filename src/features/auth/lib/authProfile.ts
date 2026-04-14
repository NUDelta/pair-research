import type { User } from '@supabase/supabase-js'

export interface AuthProfileSnapshot {
  avatar_url: string | null
  full_name: string | null
}

export function getAuthProfileSnapshot(user: User): AuthProfileSnapshot {
  const fullName = typeof user.user_metadata.full_name === 'string'
    ? user.user_metadata.full_name.trim()
    : ''
  const avatarUrl = typeof user.user_metadata.avatar_url === 'string'
    ? user.user_metadata.avatar_url.trim()
    : ''

  return {
    full_name: fullName === '' ? null : fullName,
    avatar_url: avatarUrl === '' ? null : avatarUrl,
  }
}
