import { useServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getOrCreateProfile } from '@/lib/actions/profile/getOrCreateProfile'
import { createClient } from '@/utils/supabase/client'

export const useAuthProfile = (
  setUserLoggedIn: (value: boolean) => void,
) => {
  const supabaseAuth = createClient().auth
  const getOrCreateProfileFn = useServerFn(getOrCreateProfile)

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ full_name: string | null, avatar_url: string | null }>({
    full_name: null,
    avatar_url: null,
  })

  const fetchProfile = useCallback(async () => {
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

      const {
        data: { user },
        error: userError,
      } = await supabaseAuth.getUser()

      if (userError || !user) {
        setUserLoggedIn(false)
        setProfile({
          full_name: null,
          avatar_url: null,
        })
        if (userError) {
          throw new Error(userError.message)
        }
        return
      }

      if (from === 'auth-callback') {
        toast.success('Logged in successfully')
      }
      if (from === 'auth-confirm') {
        toast.success('Email confirmed successfully')
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
  }, [getOrCreateProfileFn, setUserLoggedIn, supabaseAuth])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
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
