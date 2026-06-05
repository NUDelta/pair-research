import { useRouterState } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { getGooglePublicEnv } from '@/shared/config/env'
import { createClient } from '@/shared/supabase/client'
import { buildPostGoogleAuthRedirectUrl, signInWithGoogleIdToken } from '../lib/googleAuth'
import { getGoogleOneTapNextPath, shouldShowGoogleOneTap } from '../lib/googleOneTap'

const GOOGLE_IDENTITY_SCRIPT_ID = 'google-identity-services'
const GOOGLE_IDENTITY_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'
const GOOGLE_ONE_TAP_NONCE_BYTES = 32

let googleIdentityScriptPromise: Promise<void> | null = null

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function createGoogleOneTapNoncePair() {
  const bytes = new Uint8Array(GOOGLE_ONE_TAP_NONCE_BYTES)
  crypto.getRandomValues(bytes)
  const rawNonce = btoa(String.fromCharCode(...bytes))
  const hashedNonce = toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawNonce)))

  return { hashedNonce, rawNonce }
}

async function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id !== undefined) {
    return Promise.resolve()
  }

  if (googleIdentityScriptPromise !== null) {
    return googleIdentityScriptPromise
  }

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_IDENTITY_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript !== null) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google One Tap.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_IDENTITY_SCRIPT_ID
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Failed to load Google One Tap.')), { once: true })
    document.head.append(script)
  })

  return googleIdentityScriptPromise
}

export default function GoogleOneTap() {
  const isSigningInRef = useRef(false)
  const location = useRouterState({
    select: state => ({
      pathname: state.location.pathname,
      searchStr: state.location.searchStr,
    }),
  })

  useEffect(() => {
    const { clientId } = getGooglePublicEnv()
    if (clientId === '' || navigator.webdriver || !shouldShowGoogleOneTap(location.pathname)) {
      return
    }

    let mounted = true
    const supabase = createClient()
    const nextPath = getGoogleOneTapNextPath({
      pathname: location.pathname,
      search: location.searchStr,
    })

    async function promptForGoogleAccount() {
      try {
        const { data } = await supabase.auth.getSession()
        if (!mounted || data.session !== null) {
          return
        }

        await loadGoogleIdentityScript()
        if (!mounted || window.google?.accounts?.id === undefined) {
          return
        }

        const { hashedNonce, rawNonce } = await createGoogleOneTapNoncePair()
        if (!mounted) {
          return
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          context: 'signin',
          cancel_on_tap_outside: true,
          itp_support: true,
          nonce: hashedNonce,
          use_fedcm_for_prompt: true,
          callback: async (response) => {
            if (isSigningInRef.current || response.credential === undefined || response.credential === '') {
              return
            }

            isSigningInRef.current = true
            const { error } = await signInWithGoogleIdToken(supabase, response.credential, rawNonce)
            if (error !== null) {
              isSigningInRef.current = false
              toast.error(error.message)
              return
            }

            window.google?.accounts.id.cancel()
            globalThis.location.assign(buildPostGoogleAuthRedirectUrl(nextPath, globalThis.location.origin))
          },
        })

        window.google.accounts.id.prompt()
      }
      catch (error) {
        console.warn(error)
      }
    }

    void promptForGoogleAccount()

    return () => {
      mounted = false
      window.google?.accounts.id.cancel()
    }
  }, [location.pathname, location.searchStr])

  return null
}
