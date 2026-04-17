import type { User } from '@supabase/supabase-js'
import { useServerFn } from '@tanstack/react-start'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  getGoogleAvatarUrlForUser,
  isGoogleAvatarUrl,
  normalizeGoogleAvatarUrl,
} from '@/features/account/lib/avatar'
import { optimizeImageFromUrl } from '@/features/account/lib/avatar/optimizeImage'
import { updateProfile } from '@/features/account/server'
import { getOrCreateProfile } from '@/features/account/server/getOrCreateProfile'
import { getAuthProfileSnapshot } from '@/features/auth/lib/authProfile'
import { createClient } from '@/shared/supabase/client'
import { isAuthFeedbackSource } from '../lib/authFeedback'
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
  const updateProfileFn = useServerFn(updateProfile)
  const lastGoogleAvatarSyncUrlRef = useRef<string | null>(null)

  const [loading, setLoading] = useState(!anonymousE2E)
  const [profile, setProfile] = useState<{ full_name: string | null, avatar_url: string | null }>(emptyProfile)

  const setLoggedOut = useCallback(() => {
    setUserLoggedIn(false)
    // eslint-disable-next-line react/set-state-in-effect
    setProfile(emptyProfile)
    // eslint-disable-next-line react/set-state-in-effect
    setLoading(false)
  }, [setUserLoggedIn])

  const syncGoogleAvatar = useCallback(async (
    user: User,
    currentAvatarUrl: string | null,
  ) => {
    if (!isGoogleAvatarUrl(currentAvatarUrl)) {
      return
    }

    const googleAvatarUrl = getGoogleAvatarUrlForUser(user)
    if (googleAvatarUrl === null) {
      return
    }

    const normalizedGoogleAvatarUrl = normalizeGoogleAvatarUrl(googleAvatarUrl)
    if (normalizedGoogleAvatarUrl === null || lastGoogleAvatarSyncUrlRef.current === normalizedGoogleAvatarUrl) {
      return
    }

    lastGoogleAvatarSyncUrlRef.current = normalizedGoogleAvatarUrl

    const imageBuffer = await optimizeImageFromUrl(normalizedGoogleAvatarUrl)
    if (imageBuffer === null) {
      return
    }

    const latestProfile = await getOrCreateProfileFn()
    if (!isGoogleAvatarUrl(latestProfile.avatar_url)) {
      setProfile(latestProfile)
      return
    }

    const result = await updateProfileFn({
      data: {
        avatarSource: 'upload',
        imageBuffer,
        contentType: 'image/webp',
      },
    })

    if (!result.success) {
      return
    }

    const refreshedProfile = await getOrCreateProfileFn()
    setProfile(refreshedProfile)
  }, [getOrCreateProfileFn, updateProfileFn])

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
      const shouldClearFrom = isAuthFeedbackSource(from)

      if ((error !== null && error.trim() !== '') || shouldClearFrom) {
        if (shouldClearFrom) {
          url.searchParams.delete('from')
        }
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
      if (from === 'auth-login') {
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

      try {
        const result = await getOrCreateProfileFn()
        setProfile(result)
        void syncGoogleAvatar(user, result.avatar_url)
      }
      catch (profileError) {
        console.error('Failed to fetch server profile, falling back to auth metadata:', profileError)
        const fallbackProfile = getAuthProfileSnapshot(user)
        setProfile(fallbackProfile)
        void syncGoogleAvatar(user, fallbackProfile.avatar_url)
      }

      setUserLoggedIn(true)
    }
    catch (error_) {
      console.error('Failed to fetch profile:', error_)
    }
    finally {
      setLoading(false)
    }
  }, [getOrCreateProfileFn, setLoggedOut, setUserLoggedIn, supabaseAuth, syncGoogleAvatar])

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
