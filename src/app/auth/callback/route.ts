import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  const forwardedHost = request.headers.get('x-forwarded-host')

  const targetHost = forwardedHost !== null ? forwardedHost : origin
  const targetProtocol = targetHost.includes('localhost') ? 'http' : 'https'
  const targetAddress = `${targetProtocol}://${targetHost}`

  if (code !== null) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const nextWithIdentifier = `${next}?from=auth-callback`
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${nextWithIdentifier}`)
      }
      else if (forwardedHost !== null) {
        return NextResponse.redirect(`${targetAddress}${nextWithIdentifier}`)
      }
      else {
        return NextResponse.redirect(`${targetAddress}${nextWithIdentifier}`)
      }
    }
    // TODO: add error handling page
    console.error(`[AUTH CALLBACK]Error occurred: `, error instanceof Error ? error.message : error)
    return NextResponse.redirect(`${targetAddress}/?error=${encodeURIComponent(error.message)}`)
  }

  // if no code is present, redirect to the home page
  return NextResponse.redirect(`${targetAddress}/`)
}
