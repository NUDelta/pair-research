import type { UpdateProfileInputValues } from '@/features/account/schemas/account'
import { deleteStoredAvatar } from '@/features/account/server/avatar/deleteAvatar'
import { resolveAvatarUpdate } from '@/features/account/server/avatar/resolveAvatarUpdate'
import { getUser } from '@/shared/supabase/server'

/** Publishes a new avatar before deleting the replaced revision, using the observed URL as a compare-and-set. */
export async function handleUpdateProfile(data: UpdateProfileInputValues): Promise<ActionResponse> {
  let uploadedAvatarUrl: string | null = null
  let userId: string | undefined
  try {
    const { getPrismaClient } = await import('@/shared/server/prisma')
    const prisma = await getPrismaClient()
    const user = await getUser()
    userId = user.id
    const email = user.email?.trim()
    if (email === undefined || email === '') {
      throw new Error('User email is required')
    }
    if (data.expectedUserId !== undefined && data.expectedUserId !== user.id) {
      return { success: false, message: 'Profile changed. Please try again.' }
    }

    const existingProfile = await prisma.profile.findUniqueOrThrow({
      where: { id: user.id },
      select: { avatar_url: true, full_name: true },
    })
    if (data.expectedAvatarUrl !== undefined && data.expectedAvatarUrl !== existingProfile.avatar_url) {
      return { success: false, message: 'Profile changed. Please try again.' }
    }

    const { avatarUrl, shouldUpdateAvatar } = await resolveAvatarUpdate({
      avatarSource: data.avatarSource,
      userId: user.id,
      email,
      fullName: data.fullName ?? existingProfile.full_name ?? undefined,
      imageBuffer: data.imageBuffer,
      contentType: data.contentType,
    })
    if (data.avatarSource === 'upload') {
      uploadedAvatarUrl = avatarUrl
    }

    const updateData = {
      ...(data.fullName !== undefined ? { full_name: data.fullName } : {}),
      ...(shouldUpdateAvatar ? { avatar_url: avatarUrl } : {}),
    }
    if (Object.keys(updateData).length === 0) {
      return { success: false, message: 'Nothing to update' }
    }

    const result = await prisma.profile.updateMany({
      where: {
        id: user.id,
        ...(shouldUpdateAvatar ? { avatar_url: existingProfile.avatar_url } : {}),
      },
      data: updateData,
    })
    if (result.count === 0) {
      if (uploadedAvatarUrl !== null) {
        await deleteStoredAvatar(user.id, { currentAvatarUrl: uploadedAvatarUrl })
      }
      return { success: false, message: 'Profile changed. Please try again.' }
    }

    // The database now owns the uploaded revision; later cleanup must never roll it back.
    uploadedAvatarUrl = null
    if (shouldUpdateAvatar && avatarUrl !== existingProfile.avatar_url) {
      await deleteStoredAvatar(user.id, { currentAvatarUrl: existingProfile.avatar_url })
    }
    return { success: true, message: 'Profile updated successfully' }
  }
  catch (error) {
    if (uploadedAvatarUrl !== null && userId !== undefined) {
      await deleteStoredAvatar(userId, { currentAvatarUrl: uploadedAvatarUrl })
    }
    console.error('Error updating profile in database:', error)
    return { success: false, message: 'Failed to update profile' }
  }
}
