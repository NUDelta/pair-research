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

export const resetPasswordSearchSchema = z.object({
  next: z
    .string()
    .optional()
    .transform(value => value === undefined ? undefined : sanitizeRedirectPath(value, '/groups')),
  recovery: z
    .union([z.literal('1'), z.literal(1)])
    .transform(() => '1' as const)
    .optional(),
})

interface BuildAuthPageHrefOptions {
  email?: string
  nextPath?: string
  notice?: AuthNotice
}

export function buildAuthPageHref(
  path: '/forgot-password' | '/login' | '/signup',
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

interface BuildResetPasswordHrefOptions {
  nextPath?: string
  recovery?: boolean
}

export function buildResetPasswordHref(options: BuildResetPasswordHrefOptions = {}) {
  const searchParams = new URLSearchParams()

  if (options.nextPath !== undefined && options.nextPath !== '') {
    searchParams.set('next', options.nextPath)
  }

  if (options.recovery) {
    searchParams.set('recovery', '1')
  }

  return searchParams.size > 0
    ? `/reset-password?${searchParams.toString()}`
    : '/reset-password'
}
