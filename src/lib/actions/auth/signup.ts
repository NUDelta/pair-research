import { createServerFn } from '@tanstack/react-start'
import { signupSchema } from '@/lib/validators/auth'
import { gravatarLink } from '@/utils/avatar'
import { SITE_BASE_URL } from '@/utils/constants'
import { createClient } from '@/utils/supabase/server'

type SignupResponse = ActionResponse & {
  sessionEstablished?: boolean
}

export const signup = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => signupSchema.parse(data))
  .handler(async ({ data }): Promise<SignupResponse> => {
    const supabase = await createClient()
    const trimmedName = data.name.trim()
    const trimmedEmail = data.email.trim()

    const gravatarUrl = await gravatarLink(trimmedEmail, trimmedName)

    const emailRedirectTo = SITE_BASE_URL !== ''
      ? new URL('/auth/confirm?next=/groups', SITE_BASE_URL).toString()
      : undefined

    const { data: authData, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: data.password,
      options: {
        emailRedirectTo,
        data: {
          full_name: trimmedName,
          avatar_url: gravatarUrl,
        },
      },
    })
    const { user, session } = authData

    if (error) {
      console.error('Signup error:', error)

      return {
        success: false,
        message: error.code as string ?? 'Unexpected Error',
      }
    }

    if (!user) {
      return { success: false, message: 'Unexpected Error' }
    }

    return {
      success: true,
      message: session !== null
        ? `Welcome ${trimmedName}!`
        : `Welcome ${trimmedName}!\nCheck your email to confirm your account.`,
      sessionEstablished: session !== null,
    }
  })
