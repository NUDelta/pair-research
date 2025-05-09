import type { MetadataRoute } from 'next'
import { SITE_BASE_URL } from '@/utils/constants'

export default function sitemap(): MetadataRoute.Sitemap {
  if (SITE_BASE_URL === '') {
    throw new Error('SITE_BASE_URL is not defined')
  }

  return [
    {
      url: `${SITE_BASE_URL}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'yearly',
      priority: 1,
    },
  ]
}
