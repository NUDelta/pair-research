'use client'

import Link from 'next/link'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="mx-8 mt-[30vh] flex flex-col items-center justify-center text-center">
          <h1 className="mb-4 text-3xl font-bold text-red-500">
            An Unexpected Error Occurred
          </h1>
          <p className="mb-6 text-base leading-7">
            {error.message || 'Something went wrong.'}
            <br />
            Please try to remember what you were doing before this error occurred.
            <br />
            <br />
            If you can, please take a screenshot of the error message
            {' '}
            <br />
            and the steps you took to reproduce the error, and send it to the development team.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded bg-muted px-4 py-2 text-sm font-medium text-black transition-all hover:scale-105 hover:bg-accent"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="rounded bg-primary px-4 py-2 text-black text-sm no-underline transition-all hover:scale-105 hover:bg-primary/90"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  )
}
