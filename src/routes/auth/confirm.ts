import type { EmailOtpType } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { createRedirectResponse, getRequestOrigin, sanitizeRedirectPath } from '@/utils/supabase/authRedirect'
import { createClient } from '@/utils/supabase/server'

export const Route = createFileRoute('/auth/confirm')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { searchParams } = new URL(request.url)
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type') as EmailOtpType | null
        const next = sanitizeRedirectPath(searchParams.get('next'), '/groups')
        const targetOrigin = getRequestOrigin(request)

        if (token_hash !== null && type) {
          const supabase = await createClient()
          const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
          })

          if (!error) {
            const redirectUrl = new URL(next, targetOrigin)
            redirectUrl.searchParams.set('from', 'auth-confirm')
            return createRedirectResponse(redirectUrl)
          }

          const errorRedirectUrl = new URL('/', targetOrigin)
          errorRedirectUrl.searchParams.set('error', error.message)
          return createRedirectResponse(errorRedirectUrl)
        }

        return createRedirectResponse(new URL('/', targetOrigin))
      },
    },
  },
})
