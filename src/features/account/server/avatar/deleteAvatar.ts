import '@tanstack/react-start/server-only'

const AVATAR_EXTENSIONS = ['webp', 'avif'] as const

export const getStoredAvatarKeys = (id: string): string[] =>
  AVATAR_EXTENSIONS.map(extension => `images/avatars/${id}.${extension}`)

export const deleteStoredAvatar = async (id: string): Promise<void> => {
  const { deleteObject } = await import('@/shared/server/cloudflare/r2')
  await Promise.all(getStoredAvatarKeys(id).map(async (key) => {
    try {
      await deleteObject(key)
    }
    catch (error) {
      console.error('Avatar file delete failed:', error)
    }
  }))
}
