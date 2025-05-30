'use server'

import { signupSchema } from '@/lib/validators/auth'
import { gravatarLink } from '@/utils/avatar'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export const signup = async (formData: FormData): Promise<ActionResponse> => {
  const supabase = await createClient()

  const result = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    name: formData.get('name'),
  })

  if (!result.success) {
    return { success: false, message: result.error.issues[0].message }
  }

  const { data } = result

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

  revalidatePath('/', 'layout')
  return {
    success: true,
    message: `Welcome ${data.name.trim()}!\nCheck your email to confirm your account.`,
  }
}
