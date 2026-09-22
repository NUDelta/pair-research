import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import {
  clearPasswordRecoveryAuthorization,
  createPasswordRecoveryAuthorization,
  matchesPasswordRecoveryAuthorization,
  readPasswordRecoveryAuthorization,
  writePasswordRecoveryAuthorization,
} from '@/features/auth/lib/passwordRecovery'
import { getSupabasePublicEnv } from '@/shared/config/env'

let browserClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (browserClient !== undefined) {
    return browserClient
  }

  const { url, publishableKey } = getSupabasePublicEnv()
  browserClient = createBrowserClient(
    url,
    publishableKey,
  )

  browserClient.auth.onAuthStateChange((event, session) => {
    const recovery = createPasswordRecoveryAuthorization(event, session, '1')
    if (recovery !== null) {
      writePasswordRecoveryAuthorization(globalThis.sessionStorage, recovery)
      return
    }

    const existing = readPasswordRecoveryAuthorization(globalThis.sessionStorage)
    if (event === 'SIGNED_OUT' || (existing !== null && !matchesPasswordRecoveryAuthorization(session, existing))) {
      clearPasswordRecoveryAuthorization(globalThis.sessionStorage)
    }
  })

  return browserClient
}
