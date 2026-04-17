import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveAvatarUpdate } from './resolveAvatarUpdate'

const { deleteStoredAvatar, uploadAvatarFromArrayBuffer } = vi.hoisted(() => ({
  deleteStoredAvatar: vi.fn(),
  uploadAvatarFromArrayBuffer: vi.fn(),
}))

vi.mock('./deleteAvatar', () => ({
  deleteStoredAvatar,
}))

vi.mock('./uploadAvatar', () => ({
  uploadAvatarFromArrayBuffer,
}))

describe('resolveAvatarUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('keeps the current avatar unchanged by default', async () => {
    await expect(resolveAvatarUpdate({
      avatarSource: 'current',
      userId: 'user-123',
    })).resolves.toEqual({
      avatarUrl: null,
      shouldUpdateAvatar: false,
    })

    expect(deleteStoredAvatar).not.toHaveBeenCalled()
    expect(uploadAvatarFromArrayBuffer).not.toHaveBeenCalled()
  })

  it('removes stored avatars when the user clears their photo', async () => {
    deleteStoredAvatar.mockResolvedValue(undefined)

    await expect(resolveAvatarUpdate({
      avatarSource: 'none',
      userId: 'user-123',
    })).resolves.toEqual({
      avatarUrl: null,
      shouldUpdateAvatar: true,
    })

    expect(deleteStoredAvatar).toHaveBeenCalledWith('user-123')
  })

  it('uploads a replacement avatar when optimized bytes are provided', async () => {
    uploadAvatarFromArrayBuffer.mockResolvedValue('https://cdn.example.com/public/images/avatars/user-123.webp')

    await expect(resolveAvatarUpdate({
      avatarSource: 'upload',
      userId: 'user-123',
      imageBuffer: Uint8Array.from([1, 2, 3]).buffer,
      contentType: 'image/webp',
    })).resolves.toEqual({
      avatarUrl: 'https://cdn.example.com/public/images/avatars/user-123.webp',
      shouldUpdateAvatar: true,
    })
  })

  it('rejects upload requests without image bytes', async () => {
    await expect(resolveAvatarUpdate({
      avatarSource: 'upload',
      userId: 'user-123',
      contentType: 'image/webp',
    })).rejects.toThrow('Avatar image data is required')
  })
})
