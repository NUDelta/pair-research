import type { EmailOtpType } from '@supabase/supabase-js'
import type { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  const targetOrigin = forwardedHost !== null ? `https://${forwardedHost}` : origin

  if (token_hash !== null && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })
    if (!error) {
      // redirect user to specified redirect URL or root of app
      return NextResponse.redirect(`${targetOrigin}${next}?from=auth-confirm`)
    }
    else {
      // handle error
      return NextResponse.redirect(
        `${targetOrigin}/?error=${encodeURIComponent(error.message)}`,
      )
    }
  }

  // if no token_hash is present, redirect to the home page
  return NextResponse.redirect(`${targetOrigin}/`)
}
