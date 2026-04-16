import { describe, expect, it } from 'vitest'
import { buildPublicImageUrl, getR2PublicDomain } from './R2PublicUrl'

describe('getR2PublicDomain', () => {
  it('returns a normalized absolute domain without a trailing slash', () => {
    process.env.R2_PUBLIC_DOMAIN = ' https://cdn.example.com/public/ '

    expect(getR2PublicDomain()).toBe('https://cdn.example.com/public')
  })

  it('rejects blank and invalid domains', () => {
    process.env.R2_PUBLIC_DOMAIN = '   '
    expect(() => getR2PublicDomain()).toThrow(
      'R2_PUBLIC_DOMAIN is required and must be a non-empty absolute URL (for example: https://r2.example.com)',
    )

    process.env.R2_PUBLIC_DOMAIN = 'not-a-url'
    expect(() => getR2PublicDomain()).toThrow(
      'R2_PUBLIC_DOMAIN must be an absolute URL, received: not-a-url',
    )
  })
})

describe('buildPublicImageUrl', () => {
  it('joins the configured domain with a normalized and encoded object key', () => {
    process.env.R2_PUBLIC_DOMAIN = 'https://cdn.example.com/public/'

    expect(buildPublicImageUrl('/images/avatars/Ada Lovelace.webp')).toBe(
      'https://cdn.example.com/public/images/avatars/Ada%20Lovelace.webp',
    )
  })

  it('rejects empty object keys', () => {
    process.env.R2_PUBLIC_DOMAIN = 'https://cdn.example.com/public'

    expect(() => buildPublicImageUrl('')).toThrow(
      'Cannot build a public image URL from an empty object key',
    )
  })
})
