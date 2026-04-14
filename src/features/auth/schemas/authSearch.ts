import { z } from 'zod'
import { sanitizeRedirectPath } from '@/features/auth/lib/authRedirect'

export const authNoticeSchema = z.enum(['check-email', 'verified'])
export type AuthNotice = z.infer<typeof authNoticeSchema>

export const authPageSearchSchema = z.object({
  email: z.string().email().optional(),
  next: z
    .string()
    .optional()
    .transform(value => value === undefined ? undefined : sanitizeRedirectPath(value, '/groups')),
  notice: authNoticeSchema.optional(),
})

interface BuildAuthPageHrefOptions {
  email?: string
  nextPath?: string
  notice?: AuthNotice
}

export function buildAuthPageHref(
  path: '/login' | '/signup',
  options: BuildAuthPageHrefOptions = {},
) {
  const searchParams = new URLSearchParams()

  if (options.email !== undefined && options.email !== '') {
    searchParams.set('email', options.email)
  }

  if (options.nextPath !== undefined && options.nextPath !== '') {
    searchParams.set('next', options.nextPath)
  }

  if (options.notice !== undefined) {
    searchParams.set('notice', options.notice)
  }

  return searchParams.size > 0
    ? `${path}?${searchParams.toString()}`
    : path
}
