import { describe, expect, it } from 'vitest'
import { isGravatarAvatarUrl } from './avatarUrl'

describe('isGravatarAvatarUrl', () => {
  it('accepts gravatar.zla.app avatar URLs', () => {
    expect(isGravatarAvatarUrl('https://gravatar.zla.app/avatar/abc123?s=200')).toBe(true)
  })

  it('rejects blank, invalid, and non-gravatar URLs', () => {
    expect(isGravatarAvatarUrl('')).toBe(false)
    expect(isGravatarAvatarUrl('not a url')).toBe(false)
    expect(isGravatarAvatarUrl('https://example.com/avatar/abc123')).toBe(false)
  })
})
