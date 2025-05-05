import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  if (code !== null) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const nextWithIdentifier = `${next}?from=auth-callback`
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${nextWithIdentifier}`)
      }
      else if (forwardedHost !== null) {
        return NextResponse.redirect(`https://${forwardedHost}${nextWithIdentifier}`)
      }
      else {
        return NextResponse.redirect(`${origin}${nextWithIdentifier}`)
      }
    }
    // TODO: add error handling page
    return NextResponse.redirect(`${origin}/?error=${encodeURIComponent(error.message)}`)
  }

  // if no code is present, redirect to the home page
  return NextResponse.redirect(`${origin}/`)
}
