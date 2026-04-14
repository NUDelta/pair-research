import { z } from 'zod'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'

export const authPageSearchSchema = z.object({
  next: z
    .string()
    .optional()
    .transform(value => value === undefined ? undefined : sanitizeRedirectPath(value, '/groups')),
})

export function buildAuthPageHref(path: '/login' | '/signup', nextPath?: string) {
  if (nextPath === undefined || nextPath === '') {
    return path
  }

  return `${path}?${new URLSearchParams({ next: nextPath }).toString()}`
}
