import type { SupabaseClient } from '@supabase/supabase-js'
import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from '@/utils/env'

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

  return browserClient
}
