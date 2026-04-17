import { z } from 'zod'

export const legalEntryPointSchema = z.enum(['account', 'signup'])
export type LegalEntryPoint = z.infer<typeof legalEntryPointSchema>

export const legalPageSearchSchema = z.object({
  from: legalEntryPointSchema.optional(),
})

export function buildLegalPageHref(
  path: '/privacy' | '/terms',
  from?: LegalEntryPoint,
) {
  if (from === undefined) {
    return path
  }

  const searchParams = new URLSearchParams()
  searchParams.set('from', from)
  return `${path}?${searchParams.toString()}`
}

export function getLegalReturnLink(from?: LegalEntryPoint) {
  if (from === 'signup') {
    return {
      href: '/signup',
      label: 'Back to sign up',
    }
  }

  if (from === 'account') {
    return {
      href: '/account',
      label: 'Back to account',
    }
  }

  return undefined
}
