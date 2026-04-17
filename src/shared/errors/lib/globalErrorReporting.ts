const FALLBACK_ERROR_MESSAGE = 'An unexpected error occurred.'

export interface NormalizedError {
  details?: string
  message: string
  name: string
  stack?: string
  thrownType: string
}

export interface ErrorReport {
  app: string
  client: {
    language: string
    online: boolean | null
    userAgent: string
  }
  error: NormalizedError
  generatedAt: string
  reportId: string
  route: {
    hash: string
    href: string
    pathname: string
    search: string
  }
}

function describeUnknown(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined
  }

  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }

  if (value instanceof Error) {
    return value.message || value.name
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2)
    }
    catch {
      return Object.prototype.toString.call(value)
    }
  }

  return undefined
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      details: describeUnknown(error.cause),
      message: error.message || FALLBACK_ERROR_MESSAGE,
      name: error.name || 'Error',
      stack: error.stack,
      thrownType: 'Error',
    }
  }

  if (typeof error === 'string') {
    return {
      message: error,
      name: 'Thrown string',
      thrownType: 'string',
    }
  }

  if (error !== null && typeof error === 'object') {
    const record = error as Record<string, unknown>
    const message = typeof record.message === 'string' && record.message !== ''
      ? record.message
      : FALLBACK_ERROR_MESSAGE
    const name = typeof record.name === 'string' && record.name !== ''
      ? record.name
      : 'Unknown error'
    const stack = typeof record.stack === 'string' ? record.stack : undefined

    return {
      details: describeUnknown(record.cause),
      message,
      name,
      stack,
      thrownType: 'object',
    }
  }

  return {
    message: FALLBACK_ERROR_MESSAGE,
    name: 'Unknown error',
    thrownType: typeof error,
  }
}

function hashString(value: string): string {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index)
  }

  return Math.abs(hash).toString(36).toUpperCase().padStart(6, '0').slice(0, 8)
}

export function buildReportId(error: NormalizedError): string {
  return `PR-${hashString(`${error.name}|${error.message}|${error.stack ?? ''}`)}`
}

export function buildErrorReport(error: NormalizedError, reportId: string): ErrorReport {
  const location = typeof globalThis.location === 'object'
    ? globalThis.location
    : null
  const navigator = typeof globalThis.navigator === 'object'
    ? globalThis.navigator
    : null

  return {
    app: 'Pair Research',
    client: {
      language: navigator?.language ?? 'unknown',
      online: typeof navigator?.onLine === 'boolean' ? navigator.onLine : null,
      userAgent: navigator?.userAgent ?? 'unknown',
    },
    error,
    generatedAt: new Date().toISOString(),
    reportId,
    route: {
      hash: location?.hash ?? '',
      href: location?.href ?? '',
      pathname: location?.pathname ?? '',
      search: location?.search ?? '',
    },
  }
}

export function downloadErrorReport(report: ErrorReport) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = `pair-research-error-${report.reportId.toLowerCase()}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

export function isFallbackErrorMessage(message: string) {
  return message === FALLBACK_ERROR_MESSAGE
}
