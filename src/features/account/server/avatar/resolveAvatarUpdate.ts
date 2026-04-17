import type { z } from 'zod'
import type { accountAvatarSourceSchema } from '@/features/account/schemas/account'
import { deleteStoredAvatar } from './deleteAvatar'
import { uploadAvatarFromArrayBuffer } from './uploadAvatar'

export type AccountAvatarSource = z.infer<typeof accountAvatarSourceSchema>

interface ResolveAvatarUpdateOptions {
  avatarSource: AccountAvatarSource
  contentType?: string
  imageBuffer?: ArrayBuffer
  userId: string
}

interface ResolvedAvatarUpdate {
  avatarUrl: string | null
  shouldUpdateAvatar: boolean
}

export const resolveAvatarUpdate = async ({
  avatarSource,
  contentType,
  imageBuffer,
  userId,
}: ResolveAvatarUpdateOptions): Promise<ResolvedAvatarUpdate> => {
  if (avatarSource === 'current') {
    return {
      avatarUrl: null,
      shouldUpdateAvatar: false,
    }
  }

  if (avatarSource === 'none') {
    await deleteStoredAvatar(userId)
    return {
      avatarUrl: null,
      shouldUpdateAvatar: true,
    }
  }

  if (imageBuffer === undefined || contentType === undefined) {
    throw new Error('Avatar image data is required')
  }

  return {
    avatarUrl: await uploadAvatarFromArrayBuffer(userId, imageBuffer, contentType),
    shouldUpdateAvatar: true,
  }
}
