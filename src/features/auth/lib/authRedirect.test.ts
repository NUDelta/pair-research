import { describe, expect, it } from 'vitest'
import { createRedirectResponse, getRequestOrigin, sanitizeRedirectPath } from './authRedirect'

describe('sanitizeRedirectPath', () => {
  it('keeps in-app relative paths', () => {
    expect(sanitizeRedirectPath('/groups?view=all', '/')).toBe('/groups?view=all')
  })

  it('rejects external redirect targets', () => {
    expect(sanitizeRedirectPath('https://evil.example/login', '/')).toBe('/')
  })
})

describe('getRequestOrigin', () => {
  it('ignores forwarded host and protocol headers when a site origin is configured', () => {
    const request = new Request('http://internal.test/auth/callback', {
      headers: {
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'http',
      },
    })

    expect(getRequestOrigin(request, 'https://pairresearch.io')).toBe('https://pairresearch.io')
  })

  it('keeps the request origin for local development requests', () => {
    const request = new Request('http://127.0.0.1:3001/auth/callback', {
      headers: {
        'x-forwarded-host': 'evil.example',
        'x-forwarded-proto': 'https',
      },
    })

    expect(getRequestOrigin(request, 'https://pairresearch.io')).toBe('http://127.0.0.1:3001')
  })
})

describe('createRedirectResponse', () => {
  it('returns a mutable redirect response for TanStack header merging', () => {
    const response = createRedirectResponse('http://localhost:3000/groups')

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('http://localhost:3000/groups')
    expect(() => response.headers.delete('set-cookie')).not.toThrow()
  })
})
