import { createServerFn } from '@tanstack/react-start'
import { isMissingSupabaseSessionError } from '@/features/auth/lib/authErrors'
import { createClient } from '@/shared/supabase/server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error) {
    if (!isMissingSupabaseSessionError(error)) {
      console.error('[GET_CURRENT_USER]', error)
    }

    return null
  }

  return user
})
