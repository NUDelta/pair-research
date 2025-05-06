'use client'

import { getOrCreateProfile } from '@/lib/actions/profile/getOrCreateProfile'
import { createClient } from '@/utils/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export const useAuthProfile = () => {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [userLoggedIn, setUserLoggedIn] = useState(false)
  const [profile, setProfile] = useState<{ full_name: string | null, avatar_url: string | null }>({
    full_name: null,
    avatar_url: null,
  })

  const router = useRouter()
  const searchParams = useSearchParams()

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

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

      const from = searchParams.get('from')
      const error = searchParams.get('error')

      if ((error !== null && error.trim() !== '') || (from !== null && from.trim() !== '')) {
        const newParams = new URLSearchParams(searchParams.toString())
        newParams.delete('from')
        newParams.delete('error')
        router.replace(`?${newParams.toString()}`, { scroll: false })
      }

      if (from === 'auth-callback') {
        toast.success('Logged in successfully')
      }
      if (from === 'auth-confirm') {
        toast.success('Email confirmed successfully')
      }

      if (error !== null && error.trim() !== '') {
        throw new Error(error)
      }

      const result = await getOrCreateProfile()
      setProfile(result)
      setUserLoggedIn(true)
    }
    catch (error_) {
      console.error('Failed to fetch profile:', error_)
    }
    finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { loading, userLoggedIn, profile }
}
