import { SITE_BASE_URL } from '@/shared/config/constants'

export function sanitizeRedirectPath(next: string | null | undefined, fallback = '/') {
  if (next === null || next === undefined) {
    return fallback
  }

  const trimmedNext = next.trim()
  if (trimmedNext === '') {
    return fallback
  }

  try {
    const url = new URL(trimmedNext, 'http://localhost')

    if (url.origin !== 'http://localhost') {
      return fallback
    }

    const path = `${url.pathname}${url.search}${url.hash}`
    return path.startsWith('/') ? path : fallback
  }
  catch {
    return fallback
  }
}

export function getRequestOrigin(request: Request, siteBaseUrl = SITE_BASE_URL) {
  const url = new URL(request.url)
  const configuredOrigin = getConfiguredSiteOrigin(siteBaseUrl)

  if (isLocalRequestHost(url.hostname)) {
    return url.origin
  }

  return configuredOrigin ?? url.origin
}

function getConfiguredSiteOrigin(siteBaseUrl: string) {
  const trimmedSiteBaseUrl = siteBaseUrl.trim()
  if (trimmedSiteBaseUrl === '') {
    return null
  }

  try {
    return new URL(trimmedSiteBaseUrl).origin
  }
  catch {
    return null
  }
}

function isLocalRequestHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

export function createRedirectResponse(location: string | URL, status = 302) {
  return new Response(null, {
    status,
    headers: {
      Location: String(location),
    },
  })
}
