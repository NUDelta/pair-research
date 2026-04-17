import { Link } from '@tanstack/react-router'
import { ArrowLeft, Compass, Home } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/buttonVariants'
import ErrorPageScaffold from './ErrorPageScaffold'

export default function NotFoundPage() {
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(previous => Math.max(previous - 1, 0))
    }, 1000)

    const redirectTimer = setTimeout(() => {
      globalThis.location.assign('/')
    }, 10_000)

    return () => {
      clearTimeout(redirectTimer)
      clearInterval(timer)
    }
  }, [])

  return (
    <ErrorPageScaffold
      label="404 Page not found"
      title="This page isn't here anymore."
      description={(
        <>
          <p>
            The link may be outdated, incomplete, or the page may have moved.
          </p>
          <p>
            We'll send you back to the homepage automatically, or you can choose where to go now.
          </p>
        </>
      )}
      icon={<Compass className="size-4" aria-hidden="true" />}
      actions={(
        <>
          <Link
            to="/"
            className={`${buttonVariants({ variant: 'default' })} no-underline`}
          >
            <Home aria-hidden="true" />
            Back home
          </Link>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (globalThis.history.length > 1) {
                globalThis.history.back()
                return
              }

              globalThis.location.assign('/')
            }}
          >
            <ArrowLeft aria-hidden="true" />
            Go back
          </Button>
        </>
      )}
      footer={(
        <p>
          If this came from a saved bookmark or course instructions, update that link so other people do not hit the same dead end.
        </p>
      )}
      aside={(
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Automatic redirect
            </p>
            <p className="mt-2 text-4xl font-semibold tracking-tight text-foreground">
              {countdown}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {countdown === 1 ? 'second' : 'seconds'}
              {' '}
              remaining before returning home.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="font-medium text-foreground">Try this next</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>Check the URL for a typo.</li>
              <li>Go back if you followed an old or copied link.</li>
              <li>Start from the homepage and navigate from there.</li>
            </ul>
          </div>
        </div>
      )}
    />
  )
}
