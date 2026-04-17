// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveAvatarUpdate } from './resolveAvatarUpdate'

const { deleteStoredAvatar, mockGravatarLink } = vi.hoisted(() => ({
  deleteStoredAvatar: vi.fn(),
  mockGravatarLink: vi.fn(),
}))

vi.mock('@/features/auth/lib', () => ({
  gravatarLink: mockGravatarLink,
}))

vi.mock('./deleteAvatar', () => ({
  deleteStoredAvatar,
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

  it('resolves a gravatar avatar and clears stored uploads first', async () => {
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

    expect(deleteStoredAvatar).toHaveBeenCalledWith('user-123')
    expect(mockGravatarLink).toHaveBeenCalledWith('ada@example.com', 'Ada Lovelace')
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
