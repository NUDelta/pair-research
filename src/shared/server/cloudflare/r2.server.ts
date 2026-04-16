import { buildPublicImageUrl } from '@/shared/lib/cloudflare/R2PublicUrl'
import { getR2Binding } from '@/shared/server/cloudflare/bindings.server'
import '@tanstack/react-start/server-only'

/**
 * Writes an object into R2.
 */
export async function putObject(
  key: string,
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
  options?: R2PutOptions,
): Promise<void> {
  await getR2Binding().put(key, body, options)
}

/**
 * Deletes an object from R2.
 */
export async function deleteObject(key: string): Promise<void> {
  await getR2Binding().delete(key)
}

/**
 * Retrieves an object from R2.
 */
export async function getObject(key: string): Promise<ReadableStream | null> {
  const object = await getR2Binding().get(key)
  return object?.body ?? null
}

/**
 * Generates a public URL for an object stored in R2 using the configured public domain.
 */
export function getObjectUrl(key: string): string {
  return buildPublicImageUrl(key)
}
