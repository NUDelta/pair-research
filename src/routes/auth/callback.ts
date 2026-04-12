import { createFileRoute } from '@tanstack/react-router'
import { createRedirectResponse, getRequestOrigin, sanitizeRedirectPath } from '@/utils/supabase/authRedirect'
import { createClient } from '@/utils/supabase/server'

export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url)
        const code = searchParams.get('code')
        const next = sanitizeRedirectPath(searchParams.get('next'), '/groups')
        const targetOrigin = getRequestOrigin(request)

        if (code !== null) {
          const supabase = await createClient()
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            const redirectUrl = new URL(next, targetOrigin)
            redirectUrl.searchParams.set('from', 'auth-callback')
            return createRedirectResponse(redirectUrl)
          }

          console.error('[AUTH CALLBACK] Error occurred:', error instanceof Error ? error.message : error)
          const errorRedirectUrl = new URL('/', targetOrigin)
          errorRedirectUrl.searchParams.set('error', error.message)
          return createRedirectResponse(errorRedirectUrl)
        }

        return createRedirectResponse(new URL('/', targetOrigin))
      },
    },
  },
})
