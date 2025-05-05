'use server'

import { createProfileWithName } from '@/lib/actions/profile/getOrCreateProfile'
import { signupSchema } from '@/lib/validators/auth'
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

  const { data: { user }, error } = await supabase.auth.signUp(data)

  if (error) {
    return { success: false, message: error.message }
  }

  if (!user) {
    return { success: false, message: 'Unexpected Error' }
  }

  // Create profile when user is created
  await createProfileWithName(user.id, data.name.trim(), data.email)

  revalidatePath('/', 'layout')
  return { success: true, message: `Welcome ${data.name.trim()}!\nCheck your email to confirm your account.` }
}
