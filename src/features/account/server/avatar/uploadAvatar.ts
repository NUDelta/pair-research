import '@tanstack/react-start/server-only'

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
  let imageExtension = 'webp'
  if (contentType === 'image/avif') {
    imageExtension = 'avif'
  }
  else if (contentType === 'image/jxl') {
    throw new Error('JPEG XL format is not supported')
  }
  else if (contentType !== 'image/webp') {
    throw new Error('Unsupported image format')
  }

  const filename = `images/avatars/${id}.${imageExtension}`

  // Use a platform-neutral byte view so the upload path works the same in
  // Workers and in isolated unit tests.
  const bytes = new Uint8Array(imageBuffer)

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
