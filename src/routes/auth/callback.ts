import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@/utils/supabase/server'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams, origin } = new URL(request.url)
        const code = searchParams.get('code')
        const next = searchParams.get('next') ?? '/'
        const forwardedHost = request.headers.get('x-forwarded-host')
        const targetHost = forwardedHost ?? new URL(origin).host
        const targetProtocol = targetHost.includes('localhost') ? 'http' : 'https'
        const targetAddress = `${targetProtocol}://${targetHost}`

        if (code !== null) {
          const supabase = await createClient()
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            return Response.redirect(`${targetAddress}${next}?from=auth-callback`, 302)
          }

          console.error('[AUTH CALLBACK] Error occurred:', error instanceof Error ? error.message : error)
          return Response.redirect(`${targetAddress}/?error=${encodeURIComponent(error.message)}`, 302)
        }

        return Response.redirect(`${targetAddress}/`, 302)
      },
    },
  },
})
