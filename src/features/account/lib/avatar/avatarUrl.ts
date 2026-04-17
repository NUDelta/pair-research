const gravatarHost = 'gravatar.zla.app'

export const isGravatarAvatarUrl = (value: string | null | undefined): boolean => {
  if (typeof value !== 'string' || value.trim() === '') {
    return false
  }

  try {
    const url = new URL(value)
    return url.hostname === gravatarHost && url.pathname.startsWith('/avatar/')
  }
  catch {
    return false
  }
}
