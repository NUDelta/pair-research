import '@tanstack/react-start/server-only'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { getSupabasePublicEnv } from '@/shared/config/env'
import { getRequiredServerEnv } from '@/shared/server/env.server'

const supabaseUrlSchema = z.string().url().nonempty()
const supabaseSecretKeySchema = z.string().nonempty()

export const createServiceRoleSupabase = () => {
  const urlPayload = supabaseUrlSchema.safeParse(getSupabasePublicEnv().url)
  const secretKeyPayload = supabaseSecretKeySchema.safeParse(
    getRequiredServerEnv('SUPABASE_SECRET_KEY', 'Invalid Supabase secret key environment variable. Check SUPABASE_SECRET_KEY.'),
  )

  if (!urlPayload.success) {
    throw new Error('Invalid Supabase URL environment variable. Check SUPABASE_URL or VITE_SUPABASE_URL.')
  }

  if (!secretKeyPayload.success) {
    throw new Error('Invalid Supabase secret key environment variable. Check SUPABASE_SECRET_KEY.')
  }

  const url = urlPayload.data
  const secretKey = secretKeyPayload.data

  return createClient(
    url,
    secretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  )
}
