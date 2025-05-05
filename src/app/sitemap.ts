import type { MetadataRoute } from 'next'
import { SITE_BASE_URL } from '@/utils/constants'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_BASE_URL}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 1,
    },
  ]
}
