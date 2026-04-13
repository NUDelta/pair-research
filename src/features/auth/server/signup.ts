import { createServerFn } from '@tanstack/react-start'
import { gravatarLink } from '@/features/auth/lib'
import { signupSchema } from '@/features/auth/schemas/auth'
import { SITE_BASE_URL } from '@/shared/config/constants'
import { createClient } from '@/shared/supabase/server'

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
