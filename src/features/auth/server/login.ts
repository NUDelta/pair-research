import { createServerFn } from '@tanstack/react-start'
import { loginSchema } from '@/features/auth/schemas/auth'
import { createClient } from '@/shared/supabase/server'

export const login = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => loginSchema.parse(data))
  .handler(async ({ data }): Promise<ActionResponse> => {
    const supabase = await createClient()

    const { error } = await supabase.auth.signInWithPassword(data)

    if (error) {
      return { success: false, message: error.message }
    }

    return { success: true, message: 'Login successful' }
  })
