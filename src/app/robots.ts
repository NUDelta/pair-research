import type { MetadataRoute } from 'next'
import { SITE_BASE_URL } from '@/utils/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/*',
    },
    sitemap: `${SITE_BASE_URL}/sitemap.xml`,
  }
}
