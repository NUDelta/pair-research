import { describe, expect, it } from 'vitest'
import { authPageSearchSchema, buildAuthPageHref } from './authSearch'

describe('authPageSearchSchema', () => {
  it('keeps safe in-app next paths', () => {
    expect(authPageSearchSchema.parse({ next: '/groups?view=mine' })).toEqual({
      next: '/groups?view=mine',
    })
  })

  it('falls back to /groups for external next paths', () => {
    expect(authPageSearchSchema.parse({ next: 'https://evil.example/login' })).toEqual({
      next: '/groups',
    })
  })
})

describe('buildAuthPageHref', () => {
  it('returns the bare path when no next path is provided', () => {
    expect(buildAuthPageHref('/login')).toBe('/login')
  })

  it('preserves next when building auth links', () => {
    expect(buildAuthPageHref('/signup', '/groups/my-group')).toBe('/signup?next=%2Fgroups%2Fmy-group')
  })
})
