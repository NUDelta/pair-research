/// <reference types="@cloudflare/vitest-plugin/types" />
import type { GroupSessionDO } from '@/durable-objects/group-session-do'

declare module 'cloudflare:workers' {
  interface ProvidedEnv {
    GROUP_SESSIONS: DurableObjectNamespace<GroupSessionDO>
  }
}
