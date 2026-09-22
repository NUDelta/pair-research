import type { Session } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import {
  createPasswordRecoveryAuthorization,
  matchesPasswordRecoveryAuthorization,
  readPasswordRecoveryAuthorization,
  writePasswordRecoveryAuthorization,
} from './passwordRecovery'

function session(sessionId: string, userId = 'user-1') {
  const payload = globalThis.btoa(JSON.stringify({ session_id: sessionId }))
  return {
    access_token: `header.${payload}.signature`,
    user: { id: userId },
  } as Session
}

describe('password recovery authorization', () => {
  it('binds an observed recovery event to its user and session ID', () => {
    expect(createPasswordRecoveryAuthorization('PASSWORD_RECOVERY', session('session-1'), '1')).toEqual({
      sessionId: 'session-1',
      userId: 'user-1',
    })
  })

  it('rejects a normal existing session even when the URL has a recovery marker', () => {
    expect(createPasswordRecoveryAuthorization('INITIAL_SESSION', session('session-1'), '1')).toBeNull()
    expect(createPasswordRecoveryAuthorization('SIGNED_IN', session('session-1'), '1')).toBeNull()
  })

  it('rejects missing sessions and marker-only navigation', () => {
    expect(createPasswordRecoveryAuthorization('PASSWORD_RECOVERY', null, '1')).toBeNull()
    expect(createPasswordRecoveryAuthorization('PASSWORD_RECOVERY', session('session-1'), undefined)).toBeNull()
  })

  it('revokes recovery authorization when the same user gets a different session', () => {
    const authorization = createPasswordRecoveryAuthorization('PASSWORD_RECOVERY', session('session-1'), '1')

    expect(matchesPasswordRecoveryAuthorization(session('session-1'), authorization)).toBe(true)
    expect(matchesPasswordRecoveryAuthorization(session('session-2'), authorization)).toBe(false)
    expect(matchesPasswordRecoveryAuthorization(session('session-1', 'user-2'), authorization)).toBe(false)
  })

  it('persists a recovery event long enough for a route listener to consume it', () => {
    const values = new Map<string, string>()
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    }
    const authorization = createPasswordRecoveryAuthorization('PASSWORD_RECOVERY', session('session-1'), '1')
    expect(authorization).not.toBeNull()

    writePasswordRecoveryAuthorization(storage, authorization!)

    expect(readPasswordRecoveryAuthorization(storage)).toEqual(authorization)
  })
})
