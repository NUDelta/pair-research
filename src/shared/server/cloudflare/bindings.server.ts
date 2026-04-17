import { env } from 'cloudflare:workers'
import { assertBinding } from '@/shared/lib/cloudflare/errors'
import '@tanstack/react-start/server-only'

/**
 * Returns the configured R2 bucket used by MomoPix image storage.
 *
 * @throws {MissingBindingError} When `R2_BUCKET` is not bound in Cloudflare runtime.
 */
export function getR2Binding(): R2Bucket {
  return assertBinding(env.R2_BUCKET, 'R2_BUCKET')
}
