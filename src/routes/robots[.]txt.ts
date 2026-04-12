import { createFileRoute } from '@tanstack/react-router'
import { SITE_BASE_URL } from '@/utils/constants'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        const body = [
          'User-agent: *',
          'Disallow: /',
          '',
          `Sitemap: ${SITE_BASE_URL}/sitemap.xml`,
        ].join('\n')

        return new Response(body, {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
        })
      },
    },
  },
})
