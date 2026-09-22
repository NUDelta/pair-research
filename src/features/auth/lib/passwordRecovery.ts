import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const PASSWORD_RECOVERY_STORAGE_KEY = 'pair-research:password-recovery-session'

export interface PasswordRecoveryAuthorization {
  sessionId: string
  userId: string
}

interface JwtClaims {
  session_id?: unknown
}

export function getSessionId(session: Session): string | null {
  const payload = session.access_token.split('.')[1]
  if (payload === undefined) {
    return null
  }

  try {
    const normalized = payload.replaceAll('-', '+').replaceAll('_', '/')
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const claims = JSON.parse(globalThis.atob(padded)) as JwtClaims
    return typeof claims.session_id === 'string' && claims.session_id.length > 0
      ? claims.session_id
      : null
  }
  catch {
    return null
  }
}

export function createPasswordRecoveryAuthorization(
  event: AuthChangeEvent,
  session: Session | null,
  recoveryMarker: string | undefined,
): PasswordRecoveryAuthorization | null {
  if (recoveryMarker !== '1' || event !== 'PASSWORD_RECOVERY' || session === null) {
    return null
  }

  const sessionId = getSessionId(session)
  return sessionId === null
    ? null
    : { sessionId, userId: session.user.id }
}

export function matchesPasswordRecoveryAuthorization(
  session: Session | null,
  authorization: PasswordRecoveryAuthorization | null,
): boolean {
  return session !== null
    && authorization !== null
    && session.user.id === authorization.userId
    && getSessionId(session) === authorization.sessionId
}

export function readPasswordRecoveryAuthorization(
  storage: Pick<Storage, 'getItem' | 'removeItem'>,
): PasswordRecoveryAuthorization | null {
  const value = storage.getItem(PASSWORD_RECOVERY_STORAGE_KEY)
  if (value === null) {
    return null
  }

  try {
    const authorization = JSON.parse(value) as Partial<PasswordRecoveryAuthorization>
    if (typeof authorization.sessionId === 'string' && typeof authorization.userId === 'string') {
      return { sessionId: authorization.sessionId, userId: authorization.userId }
    }
  }
  catch {
    // Invalid or stale browser state is removed below.
  }

  storage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY)
  return null
}

export function writePasswordRecoveryAuthorization(
  storage: Pick<Storage, 'setItem'>,
  authorization: PasswordRecoveryAuthorization,
): void {
  storage.setItem(PASSWORD_RECOVERY_STORAGE_KEY, JSON.stringify(authorization))
}

export function clearPasswordRecoveryAuthorization(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(PASSWORD_RECOVERY_STORAGE_KEY)
}
