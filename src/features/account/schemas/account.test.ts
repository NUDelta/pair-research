import { describe, expect, it } from 'vitest'
import { updateProfileInputSchema } from './account'

describe('updateProfileInputSchema', () => {
  it('rejects full names that bypass client-side form validation', () => {
    expect(() =>
      updateProfileInputSchema.parse({
        avatarSource: 'current',
        fullName: 'A',
      }),
    ).toThrow(/Name is required/)

    expect(() =>
      updateProfileInputSchema.parse({
        avatarSource: 'current',
        fullName: 'A'.repeat(51),
      }),
    ).toThrow(/less than 50 characters/)
  })

  it('accepts profile updates that only change avatar state', () => {
    expect(updateProfileInputSchema.parse({
      avatarSource: 'none',
    })).toEqual({
      avatarSource: 'none',
    })
  })

  it('rejects upload payloads with missing or malformed image data', () => {
    expect(() =>
      updateProfileInputSchema.parse({
        avatarSource: 'upload',
      }),
    ).toThrow(/Avatar image data is required/)

    expect(() =>
      updateProfileInputSchema.parse({
        avatarSource: 'upload',
        imageBuffer: 'not-bytes',
        contentType: 'image/webp',
      }),
    ).toThrow()

    expect(() =>
      updateProfileInputSchema.parse({
        avatarSource: 'upload',
        imageBuffer: new ArrayBuffer(1),
        contentType: 'image/png',
      }),
    ).toThrow(/Unsupported image format/)
  })

  it('accepts supported optimized avatar upload payloads', () => {
    expect(updateProfileInputSchema.parse({
      avatarSource: 'upload',
      imageBuffer: new ArrayBuffer(1),
      contentType: 'image/webp',
    })).toEqual({
      avatarSource: 'upload',
      imageBuffer: expect.any(ArrayBuffer),
      contentType: 'image/webp',
    })
  })
})
