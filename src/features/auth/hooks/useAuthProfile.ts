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
import { isMissingSupabaseSessionError } from '../lib/authErrors'
import { getAuthErrorMessage, isAuthFeedbackSource } from '../lib/authFeedback'

const emptyProfile = {
  full_name: null,
  avatar_url: null,
} as const

export const useAuthProfile = (
  setUserLoggedIn: (value: boolean) => void,
) => {
  const [supabaseAuth] = useState(() => createClient().auth)
  const getOrCreateProfileFn = useServerFn(getOrCreateProfile)
  const updateProfileFn = useServerFn(updateProfile)
  const lastGoogleAvatarSyncUrlRef = useRef<string | null>(null)
  const generationRef = useRef(0)
  const userIdRef = useRef<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ full_name: string | null, avatar_url: string | null }>(emptyProfile)

  const setLoggedOut = useCallback(() => {
    setUserLoggedIn(false)
    setProfile(emptyProfile)
    setLoading(false)
  }, [setUserLoggedIn])

  const syncGoogleAvatar = useCallback(async (
    user: User,
    currentAvatarUrl: string | null,
    generation: number,
  ) => {
    const isCurrent = () => generationRef.current === generation
    const googleAvatarUrl = getGoogleAvatarUrlForUser(user)
    const normalizedGoogleAvatarUrl = googleAvatarUrl === null ? null : normalizeGoogleAvatarUrl(googleAvatarUrl)
    const syncKey = `${user.id}:${normalizedGoogleAvatarUrl}`
    if (!isGoogleAvatarUrl(currentAvatarUrl) || normalizedGoogleAvatarUrl === null || lastGoogleAvatarSyncUrlRef.current === syncKey) {
      return
    }

    try {
      const imageBuffer = await optimizeImageFromUrl(normalizedGoogleAvatarUrl)
      if (imageBuffer === null || !isCurrent()) {
        return
      }

      const latestProfile = await getOrCreateProfileFn()
      if (!isCurrent() || latestProfile.id !== user.id) {
        return
      }
      if (!isGoogleAvatarUrl(latestProfile.avatar_url)) {
        setProfile(latestProfile)
        return
      }

      const result = await updateProfileFn({
        data: {
          avatarSource: 'upload',
          imageBuffer,
          contentType: 'image/webp',
          expectedUserId: user.id,
          expectedAvatarUrl: latestProfile.avatar_url,
        },
      })
      if (!result.success || !isCurrent()) {
        return
      }

      lastGoogleAvatarSyncUrlRef.current = syncKey
      const refreshedProfile = await getOrCreateProfileFn()
      if (isCurrent() && refreshedProfile.id === user.id) {
        setProfile(refreshedProfile)
      }
    }
    catch (error) {
      if (isCurrent()) {
        console.error('Failed to sync Google avatar:', error)
      }
    }
  }, [getOrCreateProfileFn, updateProfileFn])

  const fetchProfile = useCallback(async () => {
    const generation = ++generationRef.current
    const isCurrent = () => generationRef.current === generation
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
        toast.error(getAuthErrorMessage(error))
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

      if (!isCurrent()) {
        return
      }

      if (userError || !user) {
        setLoggedOut()
        if (userError && !isMissingSupabaseSessionError(userError)) {
          throw new Error(userError.message)
        }
        return
      }

      userIdRef.current = user.id
      try {
        const result = await getOrCreateProfileFn()
        if (!isCurrent() || result.id !== user.id) {
          return
        }
        setProfile(result)
        void syncGoogleAvatar(user, result.avatar_url, generation)
      }
      catch (profileError) {
        if (!isCurrent()) {
          return
        }
        console.error('Failed to fetch server profile, falling back to auth metadata:', profileError)
        const fallbackProfile = getAuthProfileSnapshot(user)
        setProfile(fallbackProfile)
        void syncGoogleAvatar(user, fallbackProfile.avatar_url, generation)
      }

      setUserLoggedIn(true)
    }
    catch (error_) {
      if (isCurrent()) {
        console.error('Failed to fetch profile:', error_)
      }
    }
    finally {
      if (isCurrent()) {
        setLoading(false)
      }
    }
  }, [getOrCreateProfileFn, setLoggedOut, setUserLoggedIn, supabaseAuth, syncGoogleAvatar])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    let disposed = false
    const {
      data: { subscription },
    } = supabaseAuth.onAuthStateChange((_event, session) => {
      // Invalidate immediately: queued profile/image results may resolve before the next fetch.
      generationRef.current += 1
      const nextUserId = session?.user.id ?? null
      if (nextUserId !== userIdRef.current) {
        setProfile(emptyProfile)
        lastGoogleAvatarSyncUrlRef.current = null
      }
      userIdRef.current = nextUserId
      if (session === null) {
        setLoggedOut()
        return
      }
      queueMicrotask(() => {
        if (!disposed) {
          void fetchProfile()
        }
      })
    })

    return () => {
      disposed = true
      generationRef.current += 1
      subscription.unsubscribe()
    }
  }, [fetchProfile, setLoggedOut, supabaseAuth])

  return { loading, profile, refreshProfile: fetchProfile }
}
