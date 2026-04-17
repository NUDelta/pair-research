import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AvatarUploader from './AvatarUploader'

const { mockOptimizeAvatar } = vi.hoisted(() => ({
  mockOptimizeAvatar: vi.fn(),
}))

vi.mock('@/features/account/lib/avatar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/account/lib/avatar')>()
  return {
    ...actual,
    optimizeAvatar: mockOptimizeAvatar,
  }
})

describe('avatarUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOptimizeAvatar.mockResolvedValue({
      imageBuffer: Uint8Array.from([1, 2, 3]).buffer,
      contentType: 'image/webp',
    })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:avatar-preview')
  })

  it('marks the form for avatar removal when the user clears their photo', async () => {
    const user = userEvent.setup()
    const setValue = vi.fn()

    render(
      <AvatarUploader
        fullName="Ada Lovelace"
        initialUrl="https://cdn.example.com/public/images/avatars/ada.webp"
        setValue={setValue}
      />,
    )

    await user.click(screen.getByRole('button', { name: /remove photo/i }))

    expect(setValue).toHaveBeenCalledWith('avatar_source', 'none', { shouldDirty: true })
    expect(setValue).toHaveBeenCalledWith('avatar', undefined, { shouldDirty: true })
    expect(setValue).toHaveBeenCalledWith('content_type', undefined, { shouldDirty: true })
  })

  it('marks the form for avatar upload when a replacement image is chosen', async () => {
    const user = userEvent.setup()
    const setValue = vi.fn()

    render(
      <AvatarUploader
        fullName="Ada Lovelace"
        initialUrl=""
        setValue={setValue}
      />,
    )

    const input = document.querySelector('input[type="file"]')
    expect(input).not.toBeNull()

    await user.upload(
      input as HTMLInputElement,
      new File(['avatar'], 'avatar.png', { type: 'image/png' }),
    )

    expect(mockOptimizeAvatar).toHaveBeenCalledTimes(1)
    expect(setValue).toHaveBeenCalledWith('avatar_source', 'upload', { shouldDirty: true })
    expect(setValue).toHaveBeenCalledWith(
      'avatar',
      expect.any(ArrayBuffer),
      { shouldDirty: true },
    )
    expect(setValue).toHaveBeenCalledWith('content_type', 'image/webp', { shouldDirty: true })
  })
})
