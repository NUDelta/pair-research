import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { ResponseHeaderName } from '@tanstack/react-start/server'
import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie, setResponseHeader } from '@tanstack/react-start/server'
import { getSupabasePublicEnv } from '@/utils/env'

export async function createClient(): Promise<SupabaseClient> {
  const cookies = getCookies()
  const { url, publishableKey } = getSupabasePublicEnv()

  return createServerClient(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value,
          }))
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            setCookie(name, value, options)
          })
          Object.entries(headers).forEach(([name, value]) => {
            setResponseHeader(name as ResponseHeaderName, value)
          })
        },
      },
    },
  )
}

export const getUser = async (): Promise<User> => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    throw new Error(error.message)
  }
  if (!user) {
    throw new Error('User not found')
  }

  return user
}
