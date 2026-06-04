export const SEO_SITE_NAME = 'Pair Research'

export const SEO_DEFAULT_TITLE = 'Pair Research'

export const SEO_DEFAULT_DESCRIPTION
  = 'Pair Research helps academic teams match collaborators, overcome blockers, and coordinate peer support inside research and classroom groups.'

export const SEO_DEFAULT_KEYWORDS = [
  'Pair Research',
  'academic collaboration',
  'research collaboration',
  'peer support',
  'group collaboration',
  'team blockers',
  'Delta Lab',
] as const

export const SEO_HOME_KEYWORDS = [
  'Pair Research',
  'research collaboration software',
  'academic collaboration',
  'peer support',
  'group collaboration',
  'collaborative learning',
  'research group coordination',
  'Delta Lab',
] as const

export const SEO_PRIVACY_KEYWORDS = [
  'Pair Research privacy policy',
  'Pair Research data privacy',
  'academic collaboration privacy',
  'Northwestern University privacy',
] as const

export const SEO_TERMS_KEYWORDS = [
  'Pair Research terms',
  'Pair Research acceptable use',
  'academic collaboration terms',
  'research collaboration terms',
] as const

export const SEO_DEFAULT_IMAGE_PATH = '/images/example.png'

export const SEO_DEFAULT_IMAGE_ALT = 'Pair Research interface showing structured group collaboration features'

export const SEO_DEFAULT_IMAGE_WIDTH = 1776

export const SEO_DEFAULT_IMAGE_HEIGHT = 1170

export const SEO_INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

export const SEO_NOINDEX_ROBOTS = 'noindex, nofollow, noarchive'

export const SITEMAP_PUBLIC_ROUTES = [
  {
    path: '/',
    lastModified: '2026-05-19',
    changeFrequency: 'monthly',
    priority: 1,
  },
  {
    path: '/contact',
    lastModified: '2026-06-03',
    changeFrequency: 'yearly',
    priority: 0.5,
  },
  {
    path: '/privacy',
    lastModified: '2026-04-14',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
  {
    path: '/terms',
    lastModified: '2026-04-14',
    changeFrequency: 'yearly',
    priority: 0.4,
  },
] as const
