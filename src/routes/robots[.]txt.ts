import { createFileRoute } from '@tanstack/react-router'
import { buildRobotsTxt } from '@/shared/seo'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => {
        return new Response(buildRobotsTxt(), {
          headers: {
            'content-type': 'text/plain; charset=utf-8',
          },
        })
      },
    },
  },
})
