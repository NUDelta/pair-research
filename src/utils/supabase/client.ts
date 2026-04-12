import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublicEnv } from '@/utils/env'

export function createClient() {
  const { url, anonKey } = getSupabasePublicEnv()

  return createBrowserClient(
    url,
    anonKey,
  )
}
