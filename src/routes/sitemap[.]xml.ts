import { createFileRoute } from '@tanstack/react-router'
import { SITE_BASE_URL } from '@/shared/config/constants'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        if (SITE_BASE_URL === '') {
          throw new Error('SITE_BASE_URL is not defined')
        }

        const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_BASE_URL}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

        return new Response(body, {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
          },
        })
      },
    },
  },
})
