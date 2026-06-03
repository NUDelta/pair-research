import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TURNSTILE_ERROR_CODES } from './constants'

describe('verifyTurnstileToken', () => {
  const originalSecret = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
  const originalSiteBaseUrl = process.env.VITE_SITE_BASE_URL
  const fetchMock = vi.fn()

  beforeEach(() => {
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret'
    process.env.VITE_SITE_BASE_URL = 'https://pairresearch.io'
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = originalSecret
    process.env.VITE_SITE_BASE_URL = originalSiteBaseUrl
    vi.unstubAllGlobals()
  })

  it('accepts a valid verification response with a matching action', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        'success': true,
        'action': 'signup',
        'hostname': 'pairresearch.io',
        'metadata': {
          interactive: false,
        },
        'error-codes': [],
      }),
    })

    const { verifyTurnstileToken } = await import('./server')
    const result = await verifyTurnstileToken({
      action: 'signup',
      token: 'token',
    })

    expect(result).toMatchObject({
      success: true,
      interactive: false,
      errors: [],
    })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('rejects mismatched action payloads', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        'success': true,
        'action': 'signup',
        'metadata': {
          interactive: false,
        },
        'error-codes': [],
      }),
    })

    const { verifyTurnstileToken } = await import('./server')
    const result = await verifyTurnstileToken({
      action: 'login',
      token: 'token',
    })

    expect(result).toMatchObject({
      success: false,
      code: TURNSTILE_ERROR_CODES.failed,
      errors: ['action-mismatch'],
    })
  })

  it('rejects payloads missing an action', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        'success': true,
        'hostname': 'pairresearch.io',
        'metadata': {
          interactive: false,
        },
        'error-codes': [],
      }),
    })

    const { verifyTurnstileToken } = await import('./server')
    const result = await verifyTurnstileToken({
      action: 'login',
      token: 'token',
    })

    expect(result).toMatchObject({
      success: false,
      code: TURNSTILE_ERROR_CODES.failed,
      errors: ['action-mismatch'],
    })
  })

  it('rejects payloads issued for an unexpected hostname', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        'success': true,
        'action': 'contact',
        'hostname': 'attacker.example',
        'metadata': {
          interactive: false,
        },
        'error-codes': [],
      }),
    })

    const { verifyTurnstileToken } = await import('./server')
    const result = await verifyTurnstileToken({
      action: 'contact',
      token: 'token',
    })

    expect(result).toMatchObject({
      success: false,
      code: TURNSTILE_ERROR_CODES.failed,
      errors: ['hostname-mismatch'],
    })
  })

  it('rejects payloads missing a hostname', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        'success': true,
        'action': 'contact',
        'metadata': {
          interactive: false,
        },
        'error-codes': [],
      }),
    })

    const { verifyTurnstileToken } = await import('./server')
    const result = await verifyTurnstileToken({
      action: 'contact',
      token: 'token',
    })

    expect(result).toMatchObject({
      success: false,
      code: TURNSTILE_ERROR_CODES.failed,
      errors: ['hostname-mismatch'],
    })
  })

  it('returns a safe failure when the verification request fails', async () => {
    fetchMock.mockRejectedValue(new Error('network unavailable'))

    const { verifyTurnstileToken } = await import('./server')
    const result = await verifyTurnstileToken({
      action: 'contact',
      token: 'token',
    })

    expect(result).toMatchObject({
      success: false,
      interactive: true,
      code: TURNSTILE_ERROR_CODES.failed,
      errors: ['request-failed'],
    })
  })

  it('returns a safe failure when the verification response is invalid JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('invalid json')
      },
    })

    const { verifyTurnstileToken } = await import('./server')
    const result = await verifyTurnstileToken({
      action: 'contact',
      token: 'token',
    })

    expect(result).toMatchObject({
      success: false,
      interactive: true,
      code: TURNSTILE_ERROR_CODES.failed,
      errors: ['invalid-response'],
    })
  })
})
