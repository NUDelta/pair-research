'use server'

import { loginSchema } from '@/lib/validators/auth'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export const login = async (formData: FormData): Promise<ActionResponse> => {
  const supabase = await createClient()

  const result = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!result.success) {
    return { success: false, message: result.error.issues[0].message }
  }

  const { data } = result

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { success: false, message: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, message: 'Login successful' }
}
