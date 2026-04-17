import type { EmailOtpType } from '@supabase/supabase-js'
import { createFileRoute } from '@tanstack/react-router'
import { createRedirectResponse, getRequestOrigin, sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'
import { buildAuthPageHref } from '@/features/auth/schemas/authSearch'
import { createClient } from '@/shared/supabase/server'

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
          const { data, error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
          })

          if (!error) {
            const redirectUrl = new URL(
              data.session !== null
                ? next
                : buildAuthPageHref('/signup', {
                    email: data.user?.email,
                    nextPath: next,
                    notice: 'verified',
                  }),
              targetOrigin,
            )
            redirectUrl.searchParams.set('from', 'auth-confirm')
            return createRedirectResponse(redirectUrl)
          }

          const errorRedirectUrl = new URL(buildAuthPageHref('/login', { nextPath: next }), targetOrigin)
          errorRedirectUrl.searchParams.set('error', error.message)
          return createRedirectResponse(errorRedirectUrl)
        }

        return createRedirectResponse(new URL(buildAuthPageHref('/login', { nextPath: next }), targetOrigin))
      },
    },
  },
})
