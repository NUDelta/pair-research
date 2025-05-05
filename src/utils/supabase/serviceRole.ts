'use server'

import { createClient } from '@supabase/supabase-js'

export const createServiceRoleSupabase = async () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SERVICE_ROLE_SECRET!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
)
