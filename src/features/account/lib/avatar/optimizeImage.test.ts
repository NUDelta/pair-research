import { beforeEach, describe, expect, it, vi } from 'vitest'
import { optimizeImage, optimizeImageFromUrl } from './optimizeImage'

const { encode, revokeObjectURL } = vi.hoisted(() => ({ encode: vi.fn(), revokeObjectURL: vi.fn() }))
vi.mock('@jsquash/webp', () => ({ encode }))

describe('image optimization cleanup', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:decode')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectURL)
  })

  it('settles corrupt image decoding and revokes the temporary URL', async () => {
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
      const element = createElement(tag, options)
      if (tag === 'img') {
        queueMicrotask(() => element.dispatchEvent(new Event('error')))
      }
      return element
    })
    await expect(optimizeImage(new Blob(['corrupt']))).resolves.toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:decode')
    expect(encode).not.toHaveBeenCalled()
  })

  it('revokes the temporary URL when the encoder fails', async () => {
    const createElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag, options) => {
      const element = createElement(tag, options)
      if (tag === 'img') {
        queueMicrotask(() => element.dispatchEvent(new Event('load')))
      }
      return element
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(), width: 0, height: 0 }) } as unknown as CanvasRenderingContext2D)
    encode.mockRejectedValueOnce(new Error('encoding failed'))
    await expect(optimizeImage(new Blob(['image']))).resolves.toBeNull()
    expect(encode).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:decode')
  })

  it('bounds remote avatar download time', async () => {
    const signal = AbortSignal.abort()
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal)
    const fetch = vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError'))
    vi.stubGlobal('fetch', fetch)
    await expect(optimizeImageFromUrl('https://lh3.googleusercontent.com/avatar')).rejects.toThrow('Timed out')
    expect(fetch).toHaveBeenCalledWith('https://lh3.googleusercontent.com/avatar', { signal })
    vi.unstubAllGlobals()
  })
})
