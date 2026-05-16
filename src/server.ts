import startHandler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { verifyGroupSessionTokenValue } from '@/features/groups/server/groupSessionToken'

export { GroupSessionDO } from './durable-objects/group-session-do'

const GROUP_SESSION_REALTIME_ROUTE = /^\/api\/group-sessions\/([^/]+)\/realtime$/

function isWebSocketUpgrade(request: Request): boolean {
  return request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
}

const startEntry = createServerEntry({
  async fetch(request, opts) {
    return startHandler.fetch(request, opts)
  },
})

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const routeMatch = GROUP_SESSION_REALTIME_ROUTE.exec(url.pathname)

    if (routeMatch !== null) {
      const groupId = routeMatch[1]
      const token = url.searchParams.get('token')

      if (token === null || !isWebSocketUpgrade(request)) {
        return new Response('Unauthorized group session', { status: 401 })
      }

      const payload = await verifyGroupSessionTokenValue(token, env.SUPABASE_SECRET_KEY, groupId)
      if (payload === null) {
        return new Response('Unauthorized group session', { status: 401 })
      }

      const headers = new Headers(request.headers)
      headers.set('x-pair-research-user-id', payload.userId)
      headers.set('x-pair-research-group-id', payload.groupId)

      return env.GROUP_SESSIONS.getByName(groupId).fetch(new Request(request, { headers }))
    }

    return startEntry.fetch(request)
  },
} satisfies ExportedHandler<Cloudflare.Env>
