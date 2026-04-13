import { encode } from '@jsquash/webp'

const loadImage = async (src: string): Promise<ImageData> => {
  const img = document.createElement('img')
  img.src = src
  await new Promise(resolve => img.onload = resolve)
  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [img.width, img.height]
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Failed to get canvas context')
  }
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, img.width, img.height)
}

export const optimizeImage = async (imageData: Blob | MediaSource): Promise<ArrayBuffer | null> => {
  try {
    const objectUrl = URL.createObjectURL(imageData)
    const imageDataObj = await loadImage(objectUrl)
    const webpBuffer = await encode(imageDataObj)
    URL.revokeObjectURL(objectUrl)
    return webpBuffer
  }
  catch {
    return null
  }
}

export const optimizeImageFromUrl = async (url: string): Promise<ArrayBuffer | null> => {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    },
  })
  if (!res.ok) {
    return null
  }
  const blob = await res.blob()
  return optimizeImage(blob)
}
