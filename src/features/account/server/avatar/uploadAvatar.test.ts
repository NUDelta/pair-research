import { beforeEach, describe, expect, it, vi } from 'vitest'
import { uploadAvatarFromArrayBuffer } from './uploadAvatar'

const putObject = vi.fn()
const getObjectUrl = vi.fn((key: string) => `https://cdn.example.com/public/${key}`)

vi.mock('@/shared/server/cloudflare/r2', () => ({
  getObjectUrl,
  putObject,
}))

describe('uploadAvatarFromArrayBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.R2_PUBLIC_DOMAIN = 'https://cdn.example.com/public'
  })

  it('uploads the avatar to R2 and returns the public URL', async () => {
    putObject.mockResolvedValue(undefined)

    const imageBuffer = Uint8Array.from([1, 2, 3]).buffer
    await expect(
      uploadAvatarFromArrayBuffer('user-123', imageBuffer, 'image/webp'),
    ).resolves.toBe('https://cdn.example.com/public/images/avatars/user-123.webp')

    expect(putObject).toHaveBeenCalledTimes(1)
    const [key, body, options] = putObject.mock.calls[0] as [
      string,
      Uint8Array,
      { httpMetadata: { contentType: string } },
    ]
    expect(key).toBe('images/avatars/user-123.webp')
    expect(body).toBeInstanceOf(Uint8Array)
    expect(Array.from(body)).toEqual([1, 2, 3])
    expect(options).toEqual({
      httpMetadata: {
        contentType: 'image/webp',
      },
    })
  })

  it('preserves avif avatars and metadata', async () => {
    putObject.mockResolvedValue(undefined)

    await expect(
      uploadAvatarFromArrayBuffer('user-123', Uint8Array.from([9]).buffer, 'image/avif'),
    ).resolves.toBe('https://cdn.example.com/public/images/avatars/user-123.avif')

    expect(putObject).toHaveBeenCalledWith(
      'images/avatars/user-123.avif',
      expect.any(Uint8Array),
      {
        httpMetadata: {
          contentType: 'image/avif',
        },
      },
    )
  })

  it('rejects unsupported image formats before writing to R2', async () => {
    await expect(
      uploadAvatarFromArrayBuffer('user-123', new ArrayBuffer(0), 'image/png'),
    ).rejects.toThrow('Unsupported image format')

    await expect(
      uploadAvatarFromArrayBuffer('user-123', new ArrayBuffer(0), 'image/jxl'),
    ).rejects.toThrow('JPEG XL format is not supported')

    expect(putObject).not.toHaveBeenCalled()
  })

  it('wraps R2 failures in a user-safe upload error', async () => {
    putObject.mockRejectedValue(new Error('boom'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      uploadAvatarFromArrayBuffer('user-123', new ArrayBuffer(0), 'image/webp'),
    ).rejects.toThrow('Avatar upload failed')

    expect(errorSpy).toHaveBeenCalledWith('Avatar file upload failed:', expect.any(Error))
  })
})
