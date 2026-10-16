// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteStoredAvatar, getStoredAvatarKeyFromUrl } from './deleteAvatar'

const deleteObject = vi.fn()
vi.mock('@/shared/server/cloudflare/r2', () => ({ deleteObject }))

describe('deleteStoredAvatar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('recognizes owned legacy and revision keys', () => {
    expect(getStoredAvatarKeyFromUrl('user-123', 'https://r2.example.com/images/avatars/user-123-AbCd12.webp')).toBe('images/avatars/user-123-AbCd12.webp')
    expect(getStoredAvatarKeyFromUrl('user-123', 'https://r2.example.com/images/avatars/user-123.avif')).toBe('images/avatars/user-123.avif')
    expect(getStoredAvatarKeyFromUrl('user-123', 'https://r2.example.com/images/avatars/other-user.webp')).toBeNull()
    expect(getStoredAvatarKeyFromUrl('user-123', 'not-a-url')).toBeNull()
  })

  it('deletes only the replaced revision', async () => {
    await deleteStoredAvatar('user-123', { currentAvatarUrl: 'https://r2.example.com/images/avatars/user-123-old.webp' })
    expect(deleteObject).toHaveBeenCalledExactlyOnceWith('images/avatars/user-123-old.webp')
  })

  it('leaves unrelated objects alone when the profile has no stored avatar', async () => {
    await deleteStoredAvatar('user-123')
    await deleteStoredAvatar('user-123', { currentAvatarUrl: 'https://gravatar.com/avatar/123' })
    expect(deleteObject).not.toHaveBeenCalled()
  })

  it('does not fail a committed profile update when old-object cleanup fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    deleteObject.mockRejectedValueOnce(new Error('unavailable'))
    await deleteStoredAvatar('user-123', { currentAvatarUrl: 'https://r2.example.com/images/avatars/user-123.webp' })
    expect(errorSpy).toHaveBeenCalledWith('Avatar file delete failed:', expect.any(Error))
  })
})
