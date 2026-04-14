import { createServerFn } from '@tanstack/react-start'
import { getCookies } from '@tanstack/react-start/server'
import { E2E_AUTH_COOKIE_NAME, isE2EAnonymousAuthMode, isMissingSupabaseSessionError } from '@/features/auth/lib/e2eAuth'
import { createClient } from '@/shared/supabase/server'

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(async () => {
  if (isE2EAnonymousAuthMode(getCookies()[E2E_AUTH_COOKIE_NAME])) {
    return null
  }

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
