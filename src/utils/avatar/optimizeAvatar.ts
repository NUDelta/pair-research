import { MAX_FILE_SIZE } from '@/utils/constants'
import { optimizeImage } from './optimizeImage'

export const optimizeAvatar = async (
  file: File,
): Promise<{ imageBuffer: ArrayBuffer, contentType: string }> => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 2MB')
  }

  // If already a webp image, no need to optimize
  let imageBuffer: ArrayBuffer | null = null
  let contentType = 'image/webp'
  if (file.type === 'image/webp') {
    imageBuffer = await file.arrayBuffer()
  }
  else if (file.type === 'image/avif') {
    contentType = 'image/avif'
    imageBuffer = await file.arrayBuffer()
  }
  else if (file.type === 'image/jxl') {
    throw new Error('JPEG XL format is not supported')
  }
  else {
    imageBuffer = await optimizeImage(file)
  }

  if (!imageBuffer) {
    throw new Error('Failed to optimize image')
  }

  return { imageBuffer, contentType }
}
