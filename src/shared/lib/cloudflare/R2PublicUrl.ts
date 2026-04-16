const REGEX_LEADING_SLASH = /^\//
const REGEX_TRAILING_SLASH = /\/$/

/**
 * Returns the configured public base URL used for direct R2 image access.
 *
 * @returns Normalized absolute base URL without trailing slash.
 * @throws Error when `R2_PUBLIC_DOMAIN` is unset or blank.
 */
export function getR2PublicDomain(): string {
  const value = process.env.R2_PUBLIC_DOMAIN?.trim() ?? ''
  if (value.length === 0) {
    throw new Error('R2_PUBLIC_DOMAIN is required and must be a non-empty absolute URL (for example: https://r2.example.com)')
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  }
  catch {
    throw new Error(`R2_PUBLIC_DOMAIN must be an absolute URL, received: ${value}`)
  }

  return parsed.toString().replace(REGEX_TRAILING_SLASH, '')
}

/**
 * Builds a public image URL from the configured R2 public domain and object key.
 *
 * @param objectKey R2 object key for one image.
 * @param domain Optional explicit public domain override.
 * @returns Absolute URL for direct image access.
 */
export function buildPublicImageUrl(objectKey: string, domain = getR2PublicDomain()): string {
  const normalizedKey = objectKey
    .replace(REGEX_LEADING_SLASH, '')
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')

  if (normalizedKey.length === 0) {
    throw new Error('Cannot build a public image URL from an empty object key')
  }

  return new URL(normalizedKey, `${domain}/`).toString()
}
