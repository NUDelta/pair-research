import '@tanstack/react-start/server-only'
import type { GroupSessionDO } from '@/durable-objects/group-session-do'
import { env } from 'cloudflare:workers'
import { assertBinding } from '@/shared/lib/cloudflare/errors'

/**
 * Returns the configured R2 bucket used by MomoPix image storage.
 *
 * @throws {MissingBindingError} When `R2_BUCKET` is not bound in Cloudflare runtime.
 */
export function getR2Binding(): R2Bucket {
  return assertBinding(env.R2_BUCKET, 'R2_BUCKET')
}

export function getGroupSession(groupId: string): DurableObjectStub<GroupSessionDO> {
  const namespace = assertBinding(env.GROUP_SESSIONS, 'GROUP_SESSIONS') as DurableObjectNamespace<GroupSessionDO>

  return namespace.getByName(groupId)
}
