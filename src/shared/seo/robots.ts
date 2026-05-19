import { SITE_BASE_URL } from '@/shared/config/constants'

const PRIVATE_ROBOT_PATHS = [
  '/account',
  '/auth',
  '/forgot-password',
  '/groups',
  '/login',
  '/reset-password',
  '/signup',
] as const

export function buildRobotsTxt({
  siteBaseUrl = SITE_BASE_URL,
  indexingEnabled = import.meta.env.PROD && SITE_BASE_URL !== '',
}: {
  siteBaseUrl?: string
  indexingEnabled?: boolean
} = {}) {
  if (!indexingEnabled) {
    return [
      'User-agent: *',
      'Disallow: /',
      '',
      siteBaseUrl === '' ? undefined : `Sitemap: ${siteBaseUrl}/sitemap.xml`,
    ].filter(line => line !== undefined).join('\n')
  }

  return [
    'User-agent: *',
    'Allow: /$',
    ...PRIVATE_ROBOT_PATHS.map(path => `Disallow: ${path}`),
    '',
    `Sitemap: ${siteBaseUrl}/sitemap.xml`,
  ].join('\n')
}
