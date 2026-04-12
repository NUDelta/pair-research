import { createServerFn } from '@tanstack/react-start'
import { uploadAvatarFromArrayBuffer } from '@/utils/avatar'
import { getUser } from '@/utils/supabase/server'

export const updateProfile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Profile payload is required')
    }

    const payload = data as {
      fullName?: string
      imageBuffer?: ArrayBuffer
      contentType?: string
    }

    return {
      fullName: payload.fullName,
      imageBuffer: payload.imageBuffer,
      contentType: payload.contentType,
    }
  })
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { prisma } = await import('@/lib/prismaClient')
      const user = await getUser()
      const id = user.id

      let avatarUrl: string | null = null
      if (data.imageBuffer !== undefined && data.contentType !== undefined) {
        avatarUrl = await uploadAvatarFromArrayBuffer(id, data.imageBuffer, data.contentType)
      }

      const updateData: Record<string, unknown> = {}
      if (data.fullName !== undefined) {
        updateData.full_name = data.fullName
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
  })
