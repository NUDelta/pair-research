import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_SIZE } from '@/shared/config/constants'
import { uploadAvatarFromArrayBuffer } from './uploadAvatar'

const { getObjectUrl, putObject } = vi.hoisted(() => ({
  getObjectUrl: vi.fn((key: string) => `https://r2.example.com/${key}`),
  putObject: vi.fn(),
}))

vi.mock('@/shared/server/cloudflare/r2', () => ({
  getObjectUrl,
  putObject,
}))

function webpBytes(): ArrayBuffer {
  return Uint8Array.from([
    0x52,
    0x49,
    0x46,
    0x46,
    0x00,
    0x00,
    0x00,
    0x00,
    0x57,
    0x45,
    0x42,
    0x50,
  ]).buffer
}

function avifBytes(): ArrayBuffer {
  return Uint8Array.from([
    0x00,
    0x00,
    0x00,
    0x00,
    0x66,
    0x74,
    0x79,
    0x70,
    0x61,
    0x76,
    0x69,
    0x66,
  ]).buffer
}

describe('uploadAvatarFromArrayBuffer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    putObject.mockResolvedValue(undefined)
  })

  it('stores valid WebP avatars with a deterministic object key', async () => {
    await expect(uploadAvatarFromArrayBuffer('user-123', webpBytes(), 'image/webp')).resolves.toBe(
      'https://r2.example.com/images/avatars/user-123.webp',
    )

    expect(putObject).toHaveBeenCalledWith(
      'images/avatars/user-123.webp',
      expect.any(Uint8Array),
      { httpMetadata: { contentType: 'image/webp' } },
    )
  })

  it('stores valid AVIF avatars with a deterministic object key', async () => {
    await expect(uploadAvatarFromArrayBuffer('user-123', avifBytes(), 'image/avif')).resolves.toBe(
      'https://r2.example.com/images/avatars/user-123.avif',
    )
  })

  it('rejects oversized avatar payloads before writing to R2', async () => {
    const upload = uploadAvatarFromArrayBuffer('user-123', new ArrayBuffer(MAX_FILE_SIZE + 1), 'image/webp')

    await expect(upload).rejects.toThrow('File size exceeds 2MB')

    expect(putObject).not.toHaveBeenCalled()
  })

  it('rejects mismatched avatar content types before writing to R2', async () => {
    const upload = uploadAvatarFromArrayBuffer('user-123', webpBytes(), 'image/avif')

    await expect(upload).rejects.toThrow('Avatar image data does not match the declared format')

    expect(putObject).not.toHaveBeenCalled()
  })
})
