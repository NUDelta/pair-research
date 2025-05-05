'use server'

import { BUCKET, S3_BASE_URL, S3_REGION } from '@/utils/constants'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: S3_REGION,
  endpoint: `${S3_BASE_URL}/s3`,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true, // Required for Supabase compatibility
})

export const uploadAvatarFromArrayBuffer = async (
  id: string,
  imageBuffer: ArrayBuffer,
  contentType: string,
): Promise<string> => {
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

  const filename = `${id}-avatar.${imageExtension}`

  const buffer = Buffer.from(imageBuffer)

  const uploadCommand = new PutObjectCommand({
    Bucket: BUCKET,
    Key: filename,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read', // so we can access it publicly
  })

  try {
    await s3.send(uploadCommand)
    return `${S3_BASE_URL}/object/public/${BUCKET}/${filename}`
  }
  catch (err) {
    console.error('S3 upload failed:', err)
    throw new Error('Avatar upload failed')
  }
}
