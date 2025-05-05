'use client'

import type { User } from '@supabase/supabase-js'
import { getOrCreateProfile } from '@/lib/actions/profile/getOrCreateProfile'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

export const useAuthProfile = (user: User | null) => {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ full_name: string | null, avatar_url: string | null }>({
    full_name: null,
    avatar_url: null,
  })

  const router = useRouter()
  const searchParams = useSearchParams()

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)

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
    }
    catch (err) {
      console.error('Failed to fetch profile:', err)
    }
    finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  return { loading, profile }
}
