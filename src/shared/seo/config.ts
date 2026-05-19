export const SEO_SITE_NAME = 'Pair Research'

export const SEO_DEFAULT_TITLE = 'Pair Research'

export const SEO_DEFAULT_DESCRIPTION
  = 'Pair Research helps academic teams match collaborators, overcome blockers, and coordinate peer support inside research and classroom groups.'

export const SEO_DEFAULT_IMAGE_PATH = '/images/example.png'

export const SEO_INDEX_ROBOTS = 'index, follow'

export const SEO_NOINDEX_ROBOTS = 'noindex, nofollow'

export const SITEMAP_PUBLIC_ROUTES = [
  {
    path: '/',
    lastModified: '2026-05-19',
    changeFrequency: 'monthly',
    priority: 1,
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
