import { describe, expect, it } from 'vitest'
import { buildLegalPageHref, getLegalReturnLink, legalPageSearchSchema } from './legalLinks'

describe('legalPageSearchSchema', () => {
  it('accepts known legal entry points', () => {
    expect(legalPageSearchSchema.parse({ from: 'signup' })).toEqual({ from: 'signup' })
    expect(legalPageSearchSchema.parse({ from: 'account' })).toEqual({ from: 'account' })
  })

  it('allows pages without a return link', () => {
    expect(legalPageSearchSchema.parse({})).toEqual({})
  })
})

describe('buildLegalPageHref', () => {
  it('builds legal page links without a source by default', () => {
    expect(buildLegalPageHref('/terms')).toBe('/terms')
  })

  it('preserves the entry point when requested', () => {
    expect(buildLegalPageHref('/privacy', 'signup')).toBe('/privacy?from=signup')
  })
})

describe('getLegalReturnLink', () => {
  it('maps signup and account entry points back to the right pages', () => {
    expect(getLegalReturnLink('signup')).toEqual({
      href: '/signup',
      label: 'Back to sign up',
    })
    expect(getLegalReturnLink('account')).toEqual({
      href: '/account',
      label: 'Back to account',
    })
  })

  it('omits the return link when no entry point is provided', () => {
    expect(getLegalReturnLink()).toBeUndefined()
  })
})
