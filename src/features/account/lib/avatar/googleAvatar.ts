import type { User } from '@supabase/supabase-js'

const googleAvatarSize = 512

export const isGoogleAvatarUrl = (value: string | null | undefined): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false
  }

  try {
    const url = new URL(value)
    return url.hostname === 'googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com')
  }
  catch {
    return false
  }
}

export const normalizeGoogleAvatarUrl = (
  value: string,
  size = googleAvatarSize,
): string | null => {
  if (!isGoogleAvatarUrl(value)) {
    return null
  }

  const url = new URL(value)
  const sizeParam = `=s${size}-c`

  if (/=[^/?#]+$/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/=[^/?#]+$/, sizeParam)
  }
  else {
    url.pathname = `${url.pathname}${sizeParam}`
  }

  return url.toString()
}

export const getGoogleAvatarUrlForUser = (user: User): string | null => {
  const avatarUrl = typeof user.user_metadata.avatar_url === 'string'
    ? user.user_metadata.avatar_url.trim()
    : ''

  const hasGoogleIdentity = user.identities?.some(identity => identity.provider === 'google')
    ?? false
  const hasGoogleProvider = Array.isArray(user.app_metadata.providers)
    && user.app_metadata.providers.includes('google')

  if ((!hasGoogleIdentity && !hasGoogleProvider) || !isGoogleAvatarUrl(avatarUrl)) {
    return null
  }

  return avatarUrl
}
