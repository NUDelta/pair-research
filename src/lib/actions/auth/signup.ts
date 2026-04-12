import { createServerFn } from '@tanstack/react-start'
import { signupSchema } from '@/lib/validators/auth'
import { gravatarLink } from '@/utils/avatar'
import { createClient } from '@/utils/supabase/server'

export const signup = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => signupSchema.parse(data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    const supabase = await createClient()

    const gravatarUrl = await gravatarLink(data.email, data.name)

    const { data: { user }, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          full_name: data.name.trim(),
          avatar_url: gravatarUrl,
        },
      },
    })

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
      message: `Welcome ${data.name.trim()}!\nCheck your email to confirm your account.`,
    }
  })
