import { createClient } from '@supabase/supabase-js'
import { getSupabasePublicEnv } from '@/utils/env'

export const createServiceRoleSupabase = async () => {
  const { url } = getSupabasePublicEnv()

  return createClient(
    url,
    process.env.SERVICE_ROLE_SECRET!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}
