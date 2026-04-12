import type { EmailOtpType } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/utils/supabase/server'

export const Route = createFileRoute('/auth/confirm')({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
            return Response.redirect(`${targetOrigin}${next}?from=auth-confirm`, 302)
          }

          return Response.redirect(`${targetOrigin}/?error=${encodeURIComponent(error.message)}`, 302)
        }

        return Response.redirect(`${targetOrigin}/`, 302)
      },
    },
  },
})
