import '@tanstack/react-start/server-only'
import type { z } from 'zod'
import type { accountAvatarSourceSchema } from '@/features/account/schemas/account'
import { gravatarLink } from '@/features/auth/lib'
import { deleteStoredAvatar } from './deleteAvatar'
import { uploadAvatarFromArrayBuffer } from './uploadAvatar'

export type AccountAvatarSource = z.infer<typeof accountAvatarSourceSchema>

interface ResolveAvatarUpdateOptions {
  avatarSource: AccountAvatarSource
  contentType?: string
  currentAvatarUrl?: string | null
  email?: string
  fullName?: string
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
  currentAvatarUrl,
  email,
  fullName,
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
    await deleteStoredAvatar(userId, { currentAvatarUrl })
    return {
      avatarUrl: null,
      shouldUpdateAvatar: true,
    }
  }

  if (avatarSource === 'gravatar') {
    if (email === undefined) {
      throw new Error('Avatar email is required')
    }

    await deleteStoredAvatar(userId, { currentAvatarUrl })

    return {
      avatarUrl: await gravatarLink(email, fullName),
      shouldUpdateAvatar: true,
    }
  }

  if (imageBuffer === undefined || contentType === undefined) {
    throw new Error('Avatar image data is required')
  }

  const avatarUrl = await uploadAvatarFromArrayBuffer(userId, imageBuffer, contentType)
  await deleteStoredAvatar(userId, {
    currentAvatarUrl,
    preserveAvatarUrl: avatarUrl,
  })

  return {
    avatarUrl,
    shouldUpdateAvatar: true,
  }
}
