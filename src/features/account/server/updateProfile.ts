import { createServerFn } from '@tanstack/react-start'
import { updateProfileInputSchema } from '@/features/account/schemas/account'

export const updateProfile = createServerFn({ method: 'POST' })
  .validator((data: unknown) => updateProfileInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { handleUpdateProfile } = await import('./updateProfile.server')
    return handleUpdateProfile(data)
  })
