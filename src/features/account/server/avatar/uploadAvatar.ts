import '@tanstack/react-start/server-only'
import { MAX_FILE_SIZE } from '@/shared/config/constants'

const AVATAR_CONTENT_TYPES = {
  avif: 'image/avif',
  webp: 'image/webp',
} as const

const WEBP_HEADER_BYTES = [0x52, 0x49, 0x46, 0x46] as const
const WEBP_FORMAT_BYTES = [0x57, 0x45, 0x42, 0x50] as const
const ISO_BASE_MEDIA_FILE_TYPE_BYTES = [0x66, 0x74, 0x79, 0x70] as const
const AVIF_BRAND_BYTES = [0x61, 0x76, 0x69, 0x66] as const
const AVIS_BRAND_BYTES = [0x61, 0x76, 0x69, 0x73] as const

type AvatarContentType = (typeof AVATAR_CONTENT_TYPES)[keyof typeof AVATAR_CONTENT_TYPES]

/**
 * Stores one optimized avatar image in R2 and returns its public URL.
 *
 * The object key is deterministic per user so a replacement upload overwrites the
 * previous avatar instead of leaving orphaned objects behind.
 *
 * @param id Auth user id used to derive the stable avatar object key.
 * @param imageBuffer Optimized avatar bytes ready to persist.
 * @param contentType MIME type produced by the avatar optimization pipeline.
 * @returns Publicly accessible R2 URL for the stored avatar.
 */
export const uploadAvatarFromArrayBuffer = async (
  id: string,
  imageBuffer: ArrayBuffer,
  contentType: string,
): Promise<string> => {
  const { getObjectUrl, putObject } = await import('@/shared/server/cloudflare/r2')
  const bytes = new Uint8Array(imageBuffer)
  const imageExtension = validateAvatarBytes(bytes, contentType)

  const filename = `images/avatars/${id}.${imageExtension}`

  // Use a platform-neutral byte view so the upload path works the same in
  // Workers and in isolated unit tests.
  try {
    await putObject(filename, bytes, {
      httpMetadata: {
        contentType,
      },
    })
    return getObjectUrl(filename)
  }
  catch (err) {
    console.error('Avatar file upload failed:', err)
    throw new Error('Avatar upload failed')
  }
}

function validateAvatarBytes(bytes: Uint8Array, contentType: string): keyof typeof AVATAR_CONTENT_TYPES {
  if (bytes.byteLength === 0) {
    throw new Error('Avatar image data is required')
  }

  if (bytes.byteLength > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 2MB')
  }

  if (!isSupportedAvatarContentType(contentType)) {
    throw new Error('Unsupported image format')
  }

  if (contentType === AVATAR_CONTENT_TYPES.webp && hasWebpSignature(bytes)) {
    return 'webp'
  }

  if (contentType === AVATAR_CONTENT_TYPES.avif && hasAvifSignature(bytes)) {
    return 'avif'
  }

  throw new Error('Avatar image data does not match the declared format')
}

function isSupportedAvatarContentType(contentType: string): contentType is AvatarContentType {
  return contentType === AVATAR_CONTENT_TYPES.webp || contentType === AVATAR_CONTENT_TYPES.avif
}

function hasBytesAt(bytes: Uint8Array, offset: number, expected: readonly number[]): boolean {
  return expected.every((byte, index) => bytes[offset + index] === byte)
}

function hasWebpSignature(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 12
    && hasBytesAt(bytes, 0, WEBP_HEADER_BYTES)
    && hasBytesAt(bytes, 8, WEBP_FORMAT_BYTES)
}

function hasAvifSignature(bytes: Uint8Array): boolean {
  return bytes.byteLength >= 12
    && hasBytesAt(bytes, 4, ISO_BASE_MEDIA_FILE_TYPE_BYTES)
    && (hasBytesAt(bytes, 8, AVIF_BRAND_BYTES) || hasBytesAt(bytes, 8, AVIS_BRAND_BYTES))
}
