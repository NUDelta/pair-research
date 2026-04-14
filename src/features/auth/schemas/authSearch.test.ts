import { describe, expect, it } from 'vitest'
import { authPageSearchSchema, buildAuthPageHref, buildResetPasswordHref, resetPasswordSearchSchema } from './authSearch'

describe('authPageSearchSchema', () => {
  it('keeps safe in-app next paths', () => {
    expect(authPageSearchSchema.parse({ next: '/groups?view=mine' })).toEqual({
      next: '/groups?view=mine',
    })
  })

  it('keeps email and notice state for auth notices', () => {
    expect(authPageSearchSchema.parse({
      email: 'person@example.com',
      next: '/groups',
      notice: 'check-email',
    })).toEqual({
      email: 'person@example.com',
      next: '/groups',
      notice: 'check-email',
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
    expect(buildAuthPageHref('/signup', { nextPath: '/groups/my-group' })).toBe('/signup?next=%2Fgroups%2Fmy-group')
  })

  it('includes notice state when building login links', () => {
    expect(buildAuthPageHref('/login', {
      email: 'person@example.com',
      nextPath: '/groups',
      notice: 'check-email',
    })).toBe('/login?email=person%40example.com&next=%2Fgroups&notice=check-email')
  })
})

describe('resetPasswordSearchSchema', () => {
  it('keeps safe next paths and recovery markers', () => {
    expect(resetPasswordSearchSchema.parse({
      next: '/groups?view=mine',
      recovery: '1',
    })).toEqual({
      next: '/groups?view=mine',
      recovery: '1',
    })
  })

  it('normalizes numeric recovery markers from TanStack search parsing', () => {
    expect(resetPasswordSearchSchema.parse({
      next: '/groups',
      recovery: 1,
    })).toEqual({
      next: '/groups',
      recovery: '1',
    })
  })

  it('falls back to /groups for external next paths', () => {
    expect(resetPasswordSearchSchema.parse({
      next: 'https://evil.example/reset',
      recovery: '1',
    })).toEqual({
      next: '/groups',
      recovery: '1',
    })
  })
})

describe('buildResetPasswordHref', () => {
  it('includes the recovery marker when requested', () => {
    expect(buildResetPasswordHref({
      nextPath: '/groups',
      recovery: true,
    })).toBe('/reset-password?next=%2Fgroups&recovery=1')
  })
})
