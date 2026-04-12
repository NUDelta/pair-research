import { z } from 'zod'

const supabaseUrlSchema = z.url().nonempty()
const supabaseAnonKeySchema = z.string().nonempty()

export function getSupabasePublicEnv() {
  const url = supabaseUrlSchema.safeParse(import.meta.env.VITE_SUPABASE_URL ?? '')
  const anonKey = supabaseAnonKeySchema.safeParse(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '')

  if (!url.success || !anonKey.success) {
    throw new Error('Invalid Supabase public environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  return {
    url: url.data,
    anonKey: anonKey.data,
  }
}
