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

export function getRequestOrigin(request: Request) {
  const url = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()

  if (forwardedHost === undefined || forwardedHost === '') {
    return url.origin
  }

  const protocol = forwardedProto !== undefined && forwardedProto !== ''
    ? forwardedProto
    : url.protocol.replace(':', '')

  return `${protocol}://${forwardedHost}`
}

export function createRedirectResponse(location: string | URL, status = 302) {
  return new Response(null, {
    status,
    headers: {
      Location: String(location),
    },
  })
}
