import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export default function NotFoundPage() {
  const [countdown, setCountdown] = useState(10)

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(previous => previous - 1)
    }, 1000)

    const redirectTimer = setTimeout(() => {
      globalThis.location.href = '/'
    }, 10_000)

    return () => {
      clearTimeout(redirectTimer)
      clearInterval(timer)
    }
  }, [])

  return (
    <div className="mx-8 mt-[30vh] flex flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-3xl font-bold text-red-400">
        404 - Page Not Found
      </h1>
      <p className="mb-6 text-base leading-7">
        Sorry, the page you are looking for does not exist or has been moved.
        <br />
        You will be redirected to the home page in
        {' '}
        <span className="font-bold text-[var(--skyblue)]">{countdown}</span>
        {' '}
        seconds.
      </p>
      <Link
        to="/"
        className="rounded bg-primary px-4 py-2 text-black no-underline transition-all-500 hover:scale-110 hover:bg-primary hover:text-black"
      >
        Back to Home
      </Link>
    </div>
  )
}
