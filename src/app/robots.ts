import type { MetadataRoute } from 'next'
import { SITE_BASE_URL } from '@/utils/constants'

// TODO: remove disallow when the site is ready for public
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // allow: '/',
      // disallow: '/*',
      disallow: '/',
    },
    sitemap: `${SITE_BASE_URL}/sitemap.xml`,
  }
}
