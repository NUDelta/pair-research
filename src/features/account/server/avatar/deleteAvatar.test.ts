import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteStoredAvatar, getStoredAvatarKeys } from './deleteAvatar'

const deleteObject = vi.fn()

vi.mock('@/shared/server/cloudflare/r2', () => ({
  deleteObject,
}))

describe('deleteStoredAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('derives the stored avatar keys for all supported formats', () => {
    expect(getStoredAvatarKeys('user-123')).toEqual([
      'images/avatars/user-123.webp',
      'images/avatars/user-123.avif',
    ])
  })

  it('attempts to delete every stored avatar variant', async () => {
    deleteObject.mockResolvedValue(undefined)

    await deleteStoredAvatar('user-123')

    expect(deleteObject).toHaveBeenCalledTimes(2)
    expect(deleteObject).toHaveBeenNthCalledWith(1, 'images/avatars/user-123.webp')
    expect(deleteObject).toHaveBeenNthCalledWith(2, 'images/avatars/user-123.avif')
  })

  it('swallows delete failures so avatar clearing still completes', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    deleteObject.mockRejectedValueOnce(new Error('missing'))
    deleteObject.mockResolvedValueOnce(undefined)

    await deleteStoredAvatar('user-123')

    expect(errorSpy).toHaveBeenCalledWith('Avatar file delete failed:', expect.any(Error))
    expect(deleteObject).toHaveBeenCalledTimes(2)
  })
})
