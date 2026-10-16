import '@tanstack/react-start/server-only'

const AVATAR_EXTENSIONS = ['webp', 'avif'] as const
const AVATAR_OBJECT_PREFIX = 'images/avatars/'

interface DeleteStoredAvatarOptions {
  currentAvatarUrl?: string | null
}

/**
 * Extracts an owned R2 avatar object key from a previously persisted public URL.
 * The ownership check prevents avatar cleanup from deleting another user's key.
 */
export function getStoredAvatarKeyFromUrl(id: string, avatarUrl: string | null | undefined): string | null {
  if (avatarUrl == null || avatarUrl.trim() === '') {
    return null
  }

  let url: URL
  try {
    url = new URL(avatarUrl)
  }
  catch {
    return null
  }

  let key: string
  try {
    key = url.pathname
      .replace(/^\//, '')
      .split('/')
      .map(segment => decodeURIComponent(segment))
      .join('/')
  }
  catch {
    return null
  }

  if (!key.startsWith(AVATAR_OBJECT_PREFIX)) {
    return null
  }

  const filename = key.slice(AVATAR_OBJECT_PREFIX.length)
  const isOwnedAvatar = AVATAR_EXTENSIONS.some(extension =>
    filename === `${id}.${extension}` || (filename.startsWith(`${id}-`) && filename.endsWith(`.${extension}`)))

  return isOwnedAvatar ? key : null
}

/** Deletes only the replaced object; unrelated revisions may belong to concurrent updates. */
export const deleteStoredAvatar = async (id: string, options: DeleteStoredAvatarOptions = {}): Promise<void> => {
  const key = getStoredAvatarKeyFromUrl(id, options.currentAvatarUrl)
  if (key === null) {
    return
  }

  const { deleteObject } = await import('@/shared/server/cloudflare/r2')
  try {
    await deleteObject(key)
  }
  catch (error) {
    console.error('Avatar file delete failed:', error)
  }
}
