import startHandler, { createServerEntry } from '@tanstack/react-start/server-entry'
import { GROUP_SESSION_WEBSOCKET_PROTOCOL } from '@/features/groups/lib/groupSessionProtocol'
import { verifyGroupSessionTokenValue } from '@/features/groups/server/groupSessionToken'

export { GroupSessionDO } from './durable-objects/group-session-do'

const GROUP_SESSION_REALTIME_ROUTE = /^\/api\/group-sessions\/([^/]+)\/realtime$/

function isWebSocketUpgrade(request: Request): boolean {
  return request.headers.get('Upgrade')?.toLowerCase() === 'websocket'
}

function getGroupSessionTokenFromProtocolHeader(request: Request): string | null {
  const protocols = request.headers
    .get('Sec-WebSocket-Protocol')
    ?.split(',')
    .map(protocol => protocol.trim())
    .filter(Boolean) ?? []

  if (protocols[0] !== GROUP_SESSION_WEBSOCKET_PROTOCOL) {
    return null
  }

  return protocols[1] ?? null
}

const startEntry = createServerEntry({
  async fetch(request, opts) {
    return startHandler.fetch(request, opts)
  },
})

type StartRequestOptions = NonNullable<Parameters<typeof startEntry.fetch>[1]>

function getStartRequestOptions(env: Cloudflare.Env, ctx: ExecutionContext): StartRequestOptions {
  return {
    context: {
      cloudflare: { env, ctx },
    },
  } as StartRequestOptions
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const routeMatch = GROUP_SESSION_REALTIME_ROUTE.exec(url.pathname)

    if (routeMatch !== null) {
      const groupId = routeMatch[1]
      const token = getGroupSessionTokenFromProtocolHeader(request)

      if (token === null || !isWebSocketUpgrade(request)) {
        return new Response('Unauthorized group session', { status: 401 })
      }

      const payload = await verifyGroupSessionTokenValue(token, env.SUPABASE_SECRET_KEY, groupId)
      if (payload === null) {
        return new Response('Unauthorized group session', { status: 401 })
      }

      const headers = new Headers(request.headers)
      headers.set('Sec-WebSocket-Protocol', GROUP_SESSION_WEBSOCKET_PROTOCOL)
      headers.set('x-pair-research-user-id', payload.userId)
      headers.set('x-pair-research-group-id', payload.groupId)

      return env.GROUP_SESSIONS.getByName(groupId).fetch(new Request(request, { headers }))
    }

    return startEntry.fetch(request, getStartRequestOptions(env, ctx))
  },
} satisfies ExportedHandler<Cloudflare.Env>
