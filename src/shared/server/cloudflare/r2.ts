import { buildPublicImageUrl } from '@/shared/lib/cloudflare/R2PublicUrl'

export async function putObject(
  key: string,
  body: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob,
  options?: R2PutOptions,
): Promise<void> {
  const { putObject } = await import('./r2.server')
  await putObject(key, body, options)
}

export async function deleteObject(key: string): Promise<void> {
  const { deleteObject } = await import('./r2.server')
  await deleteObject(key)
}

export async function getObject(key: string): Promise<ReadableStream | null> {
  const { getObject } = await import('./r2.server')
  return getObject(key)
}

export function getObjectUrl(key: string): string {
  return buildPublicImageUrl(key)
}
