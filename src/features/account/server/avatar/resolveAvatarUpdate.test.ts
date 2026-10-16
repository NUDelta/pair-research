// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveAvatarUpdate } from './resolveAvatarUpdate'

const { deleteStoredAvatar, mockGravatarLink, uploadAvatarFromArrayBuffer } = vi.hoisted(() => ({
  deleteStoredAvatar: vi.fn(),
  mockGravatarLink: vi.fn(),
  uploadAvatarFromArrayBuffer: vi.fn(),
}))

vi.mock('@/features/auth/lib', () => ({
  gravatarLink: mockGravatarLink,
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
  })

  it('resolves removal without deleting the currently published avatar', async () => {
    deleteStoredAvatar.mockResolvedValue(undefined)

    await expect(resolveAvatarUpdate({
      avatarSource: 'none',
      userId: 'user-123',
    })).resolves.toEqual({
      avatarUrl: null,
      shouldUpdateAvatar: true,
    })

    expect(deleteStoredAvatar).not.toHaveBeenCalled()
  })

  it('resolves a gravatar avatar without deleting the currently published avatar', async () => {
    deleteStoredAvatar.mockResolvedValue(undefined)
    mockGravatarLink.mockResolvedValue('https://gravatar.zla.app/avatar/hash?s=200')

    await expect(resolveAvatarUpdate({
      avatarSource: 'gravatar',
      userId: 'user-123',
      email: 'ada@example.com',
      fullName: 'Ada Lovelace',
    })).resolves.toEqual({
      avatarUrl: 'https://gravatar.zla.app/avatar/hash?s=200',
      shouldUpdateAvatar: true,
    })

    expect(deleteStoredAvatar).not.toHaveBeenCalled()
    expect(mockGravatarLink).toHaveBeenCalledWith('ada@example.com', 'Ada Lovelace')
  })

  it('stores uploaded avatar bytes without deleting the currently published avatar', async () => {
    const imageBuffer = Uint8Array.from([1, 2, 3]).buffer
    uploadAvatarFromArrayBuffer.mockResolvedValue('https://r2.example.com/images/avatars/user-123.webp')

    await expect(resolveAvatarUpdate({
      avatarSource: 'upload',
      userId: 'user-123',
      imageBuffer,
      contentType: 'image/webp',
    })).resolves.toEqual({
      avatarUrl: 'https://r2.example.com/images/avatars/user-123.webp',
      shouldUpdateAvatar: true,
    })

    expect(uploadAvatarFromArrayBuffer).toHaveBeenCalledWith('user-123', imageBuffer, 'image/webp')
    expect(deleteStoredAvatar).not.toHaveBeenCalled()
  })

  it('rejects upload requests without image bytes', async () => {
    await expect(resolveAvatarUpdate({
      avatarSource: 'upload',
      userId: 'user-123',
      contentType: 'image/webp',
    })).rejects.toThrow('Avatar image data is required')
  })

  it('rejects gravatar requests without an email address', async () => {
    await expect(resolveAvatarUpdate({
      avatarSource: 'gravatar',
      userId: 'user-123',
    })).rejects.toThrow('Avatar email is required')
  })
})
