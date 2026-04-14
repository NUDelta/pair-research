import { useServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getOrCreateProfile } from '@/features/account/server/getOrCreateProfile'
import { createClient } from '@/shared/supabase/client'
import { getBrowserE2EAuthMode, isE2EAnonymousAuthMode, isMissingSupabaseSessionError } from '../lib/e2eAuth'

const emptyProfile = {
  full_name: null,
  avatar_url: null,
} as const

export const useAuthProfile = (
  setUserLoggedIn: (value: boolean) => void,
) => {
  const e2eAuthMode = getBrowserE2EAuthMode()
  const anonymousE2E = isE2EAnonymousAuthMode(e2eAuthMode)
  const supabaseAuth = anonymousE2E ? undefined : createClient().auth
  const getOrCreateProfileFn = useServerFn(getOrCreateProfile)

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ full_name: string | null, avatar_url: string | null }>(emptyProfile)

  const setLoggedOut = useCallback(() => {
    setUserLoggedIn(false)
    // eslint-disable-next-line react/set-state-in-effect
    setProfile(emptyProfile)
    // eslint-disable-next-line react/set-state-in-effect
    setLoading(false)
  }, [setUserLoggedIn])

  const fetchProfile = useCallback(async () => {
    if (!supabaseAuth) {
      setLoggedOut()
      return
    }

    setLoading(true)
    try {
      const url = new URL(globalThis.location.href)
      const from = url.searchParams.get('from')
      const error = url.searchParams.get('error')

      if ((error !== null && error.trim() !== '') || (from !== null && from.trim() !== '')) {
        url.searchParams.delete('from')
        url.searchParams.delete('error')
        const nextHref = `${url.pathname}${url.search}${url.hash}`
        globalThis.history.replaceState(null, '', nextHref)
      }

      if (error !== null && error.trim() !== '') {
        toast.error(error)
      }

      if (from === 'auth-callback') {
        toast.success('Logged in successfully')
      }
      if (from === 'auth-confirm') {
        toast.success('Email verified successfully')
      }

      const {
        data: { user },
        error: userError,
      } = await supabaseAuth.getUser()

      if (userError || !user) {
        setLoggedOut()
        if (userError && !isMissingSupabaseSessionError(userError)) {
          throw new Error(userError.message)
        }
        return
      }

      const result = await getOrCreateProfileFn()
      setProfile(result)
      setUserLoggedIn(true)
    }
    catch (error_) {
      console.error('Failed to fetch profile:', error_)
    }
    finally {
      setLoading(false)
    }
  }, [getOrCreateProfileFn, setLoggedOut, setUserLoggedIn, supabaseAuth])

  useEffect(() => {
    if (anonymousE2E) {
      setLoggedOut()
      return
    }

    if (!supabaseAuth) {
      return
    }

    void fetchProfile()
  }, [anonymousE2E, fetchProfile, setLoggedOut, supabaseAuth])

  useEffect(() => {
    if (!supabaseAuth) {
      return
    }

    const {
      data: { subscription },
    } = supabaseAuth.onAuthStateChange(() => {
      queueMicrotask(() => {
        void fetchProfile()
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchProfile, supabaseAuth])

  return { loading, profile, refreshProfile: fetchProfile }
}
