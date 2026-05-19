import { SITE_BASE_URL } from '@/shared/config/constants'
import { SITEMAP_PUBLIC_ROUTES } from './config'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function buildSitemapXml(siteBaseUrl = SITE_BASE_URL) {
  if (siteBaseUrl === '') {
    throw new Error('SITE_BASE_URL is not defined')
  }

  const urls = SITEMAP_PUBLIC_ROUTES.map((route) => {
    const loc = new URL(route.path, siteBaseUrl).toString()

    return [
      '  <url>',
      `    <loc>${escapeXml(loc)}</loc>`,
      `    <lastmod>${route.lastModified}</lastmod>`,
      `    <changefreq>${route.changeFrequency}</changefreq>`,
      `    <priority>${route.priority.toFixed(1)}</priority>`,
      '  </url>',
    ].join('\n')
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    '</urlset>',
  ].join('\n')
}
