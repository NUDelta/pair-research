import { createFileRoute } from '@tanstack/react-router'
import { buildSitemapXml } from '@/shared/seo'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: () => {
        return new Response(buildSitemapXml(), {
          headers: {
            'content-type': 'application/xml; charset=utf-8',
          },
        })
      },
    },
  },
})
