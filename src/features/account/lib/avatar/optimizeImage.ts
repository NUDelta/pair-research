import { encode } from '@jsquash/webp'

const loadImage = async (src: string): Promise<ImageData> => {
  const img = document.createElement('img')
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to decode image'))
    img.src = src
  }).finally(() => {
    img.onload = null
    img.onerror = null
  })
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
  let objectUrl: string | undefined
  try {
    objectUrl = URL.createObjectURL(imageData)
    const imageDataObj = await loadImage(objectUrl)
    return await encode(imageDataObj)
  }
  catch {
    return null
  }
  finally {
    if (objectUrl !== undefined) {
      URL.revokeObjectURL(objectUrl)
    }
  }
}

export const optimizeImageFromUrl = async (url: string): Promise<ArrayBuffer | null> => {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!res.ok) {
    return null
  }
  return optimizeImage(await res.blob())
}
