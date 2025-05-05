'use server'

import { prisma } from '@/lib/prismaClient'
import { uploadAvatarFromArrayBuffer } from '@/utils/avatar'
import { getUser } from '@/utils/supabase/server'

export const updateProfile = async (
  fullName?: string,
  imageBuffer?: ArrayBuffer,
  contentType?: string,
): Promise<ActionResponse> => {
  try {
    const user = await getUser()
    const id = user.id

    let avatarUrl: string | null = null
    if (imageBuffer !== undefined && contentType !== undefined) {
      avatarUrl = await uploadAvatarFromArrayBuffer(id, imageBuffer, contentType)
    }

    // Build update data dynamically
    const updateData: Record<string, unknown> = {}
    if (fullName !== undefined) {
      updateData.full_name = fullName
    }
    if (avatarUrl !== null) {
      updateData.avatar_url = avatarUrl
    }

    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        message: 'Nothing to update',
      }
    }

    await prisma.profile.update({
      where: { id },
      data: updateData,
      select: {
        full_name: true,
        avatar_url: true,
      },
    })

    return {
      success: true,
      message: 'Profile updated successfully',
    }
  }
  catch (error) {
    console.error('Error updating profile in database:', error)
    return {
      success: false,
      message: 'Failed to update profile',
    }
  }
}
