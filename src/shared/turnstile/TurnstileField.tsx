import type { TurnstileInstance } from '@marsidev/react-turnstile'
import type { RefObject } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { CheckCircle2, LoaderCircle, ShieldAlert, ShieldCheck } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { getTurnstilePublicEnv } from '@/shared/config/env'
import { cn } from '@/shared/lib/utils'
import { TURNSTILE_TOKEN_TIMEOUT_MS } from './constants'

type TurnstileFieldMode = 'adaptive' | 'visible'
type TurnstileFieldStatus = 'error' | 'idle' | 'loading' | 'ready' | 'required' | 'verified' | 'verifying'

export interface TurnstileFieldHandle {
  ensureToken: () => Promise<string | null>
  getToken: () => string | null
  requireInteractiveChallenge: (message?: string) => void
  reset: () => void
}

interface TurnstileFieldProps {
  /**
   * The action name to associate with the generated token. This is used for analytics and debugging purposes on Cloudflare's end, and does not affect how you should verify the token on your server. You can use any string here that helps you identify where the token is coming from (e.g. "login", "signup", "comment_form", etc.).
   */
  action: string
  className?: string
  controllerRef?: RefObject<TurnstileFieldHandle | null>
  description?: string
  mode?: TurnstileFieldMode
  onVerifiedChange?: (verified: boolean) => void
}

const statusStyles: Record<TurnstileFieldStatus, string> = {
  idle: 'text-muted-foreground',
  loading: 'text-muted-foreground',
  ready: 'text-muted-foreground',
  verifying: 'text-primary',
  verified: 'text-emerald-700',
  required: 'text-amber-700',
  error: 'text-destructive',
}

export default function TurnstileField({
  action,
  className,
  controllerRef,
  description,
  mode = 'adaptive',
  onVerifiedChange,
}: TurnstileFieldProps) {
  const { siteKey } = getTurnstilePublicEnv()
  const widgetRef = useRef<TurnstileInstance | undefined>(undefined)
  const pendingResolverRef = useRef<((value: string | null) => void) | null>(null)
  const timeoutIdRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [status, setStatus] = useState<TurnstileFieldStatus>(siteKey === '' ? 'error' : 'loading')
  const [message, setMessage] = useState<string>(
    siteKey === ''
      ? 'Security verification is unavailable right now.'
      : 'Loading security check…',
  )
  const [visibleChallenge, setVisibleChallenge] = useState(mode === 'visible')
  const [renderKey, setRenderKey] = useState(0)

  const clearPending = useCallback((nextToken: string | null) => {
    if (timeoutIdRef.current !== null) {
      globalThis.clearTimeout(timeoutIdRef.current)
      timeoutIdRef.current = null
    }

    pendingResolverRef.current?.(nextToken)
    pendingResolverRef.current = null
  }, [])

  const reset = useCallback(() => {
    widgetRef.current?.reset()
    setToken(null)
    setStatus(siteKey === '' ? 'error' : 'ready')
    setMessage(
      siteKey === ''
        ? 'Security verification is unavailable right now.'
        : visibleChallenge
          ? 'Complete the security check to continue.'
          : 'Security check ready.',
    )
    clearPending(null)
  }, [clearPending, siteKey, visibleChallenge])

  const requireInteractiveChallenge = useCallback((nextMessage = 'Please confirm you are human to continue.') => {
    setVisibleChallenge(true)
    setRenderKey(value => value + 1)
    setToken(null)
    setStatus('required')
    setMessage(nextMessage)
    clearPending(null)
  }, [clearPending])

  const handleSuccess = useCallback((nextToken: string) => {
    setToken(nextToken)
    setStatus('verified')
    setMessage('Security check complete.')
    clearPending(nextToken)
  }, [clearPending])

  const handleError = useCallback(() => {
    if (!visibleChallenge) {
      requireInteractiveChallenge('We need one more quick check before you can continue.')
      return
    }

    setToken(null)
    setStatus('error')
    setMessage('Security check failed. Please try again.')
    clearPending(null)
  }, [clearPending, requireInteractiveChallenge, visibleChallenge])

  const handleExpire = useCallback(() => {
    setToken(null)
    setStatus('required')
    setMessage('Security check expired. Please verify again.')
    clearPending(null)
  }, [clearPending])

  const ensureToken = useCallback(async () => {
    if (siteKey === '') {
      setStatus('error')
      setMessage('Security verification is unavailable right now.')
      return null
    }

    if (token !== null && token !== '') {
      return token
    }

    if (visibleChallenge) {
      setStatus('required')
      setMessage('Please complete the security check to continue.')
      return null
    }

    const widget = widgetRef.current
    if (widget === undefined) {
      setStatus('loading')
      setMessage('Loading security check…')
      return null
    }

    setStatus('verifying')
    setMessage('Checking security…')

    return new Promise<string | null>((resolve) => {
      pendingResolverRef.current = resolve
      timeoutIdRef.current = globalThis.setTimeout(() => {
        requireInteractiveChallenge('Security check timed out. Please verify again.')
      }, TURNSTILE_TOKEN_TIMEOUT_MS)
      widget.execute()
    })
  }, [requireInteractiveChallenge, siteKey, token, visibleChallenge])

  useEffect(() => {
    if (controllerRef == null) {
      return
    }

    controllerRef.current = {
      ensureToken,
      getToken: () => token,
      requireInteractiveChallenge,
      reset,
    }

    return () => {
      controllerRef.current = null
    }
  }, [controllerRef, ensureToken, requireInteractiveChallenge, reset, token])

  useEffect(() => {
    onVerifiedChange?.(token !== null && token !== '')
  }, [onVerifiedChange, token])

  const widgetOptions = useMemo(() => {
    if (visibleChallenge) {
      return {
        action,
        appearance: 'always' as const,
        execution: 'render' as const,
        size: 'flexible' as const,
        theme: 'light' as const,
      }
    }

    return {
      action,
      appearance: 'execute' as const,
      execution: 'execute' as const,
      size: 'invisible' as const,
      theme: 'light' as const,
    }
  }, [action, visibleChallenge])

  const StatusIcon = status === 'verified'
    ? CheckCircle2
    : status === 'error'
      ? ShieldAlert
      : status === 'verifying'
        ? LoaderCircle
        : ShieldCheck

  const shouldShowFrame = visibleChallenge || status === 'verifying' || status === 'required' || status === 'error'
  const shouldShowDescription = visibleChallenge && description !== undefined && description !== ''

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'rounded-2xl border border-slate-200/80 bg-slate-50/80 transition-all',
          shouldShowFrame ? 'p-3 shadow-sm sm:p-4' : 'border-transparent bg-transparent p-0 shadow-none',
        )}
      >
        {shouldShowDescription && (
          <p className="mb-3 text-sm leading-6 text-slate-600">
            {description}
          </p>
        )}
        <Turnstile
          key={`${action}-${renderKey}-${visibleChallenge ? 'visible' : 'adaptive'}`}
          ref={widgetRef}
          siteKey={siteKey}
          className={cn(!visibleChallenge && 'pointer-events-none')}
          options={widgetOptions}
          onWidgetLoad={() => {
            setStatus(token !== null ? 'verified' : 'ready')
            setMessage(
              token !== null
                ? 'Security check complete.'
                : visibleChallenge
                  ? 'Complete the security check to continue.'
                  : 'Security check ready.',
            )
          }}
          onSuccess={handleSuccess}
          onError={handleError}
          onExpire={handleExpire}
        />
      </div>

      {((status === 'error' || status === 'required') && !visibleChallenge) || status === 'verifying'
        ? (
            <div className={cn('flex items-start gap-2 text-sm', statusStyles[status])} role="status" aria-live="polite">
              <StatusIcon className={cn('mt-0.5 size-4 shrink-0', status === 'verifying' && 'animate-spin')} />
              <span>{message}</span>
            </div>
          )
        : null}
    </div>
  )
}
