import { createServerFn } from '@tanstack/react-start'

export const getOrCreateProfile = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadOrCreateProfile } = await import('./getOrCreateProfile.server')
  return loadOrCreateProfile()
})

export const createProfileWithName = async (id: string, email: string, fullName?: string) => {
  const { createProfileWithName } = await import('./getOrCreateProfile.server')
  await createProfileWithName(id, email, fullName)
}
