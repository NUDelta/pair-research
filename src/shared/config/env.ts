import { z } from 'zod'

const supabaseUrlSchema = z.string().url().nonempty()
const supabasePublishableKeySchema = z.string().nonempty()

export function getSupabasePublicEnv() {
  const url = supabaseUrlSchema.safeParse(import.meta.env.VITE_SUPABASE_URL ?? '')
  const publishableKey = supabasePublishableKeySchema.safeParse(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')

  if (!url.success || !publishableKey.success) {
    throw new Error('Invalid Supabase public environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.')
  }

  return {
    url: url.data,
    publishableKey: publishableKey.data,
  }
}
