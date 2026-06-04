import { z } from 'zod'

export const accountAvatarSourceSchema = z.enum(['current', 'upload', 'none', 'gravatar'])
const supportedAvatarContentTypeSchema = z.enum(['image/avif', 'image/webp'], {
  message: 'Unsupported image format',
})
const imageBufferSchema = z.instanceof(ArrayBuffer)

const fullNameSchema = z
  .string()
  .nonempty('Name is required')
  .min(2, 'Name is required')
  .max(50, 'Name must be less than 50 characters')

export const accountSchema = z.object({
  full_name: fullNameSchema.optional(),
  avatar_source: accountAvatarSourceSchema,
  avatar: z
    .instanceof(File)
    .or(imageBufferSchema)
    .optional(),
  content_type: supportedAvatarContentTypeSchema.optional(),
})

const updateProfileBaseInputSchema = z.object({
  avatarSource: accountAvatarSourceSchema.default('current'),
  fullName: fullNameSchema.optional(),
  imageBuffer: imageBufferSchema.optional(),
  contentType: supportedAvatarContentTypeSchema.optional(),
})

export const updateProfileInputSchema = updateProfileBaseInputSchema.superRefine((payload, context) => {
  if (payload.avatarSource !== 'upload') {
    return
  }

  if (payload.imageBuffer === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Avatar image data is required',
      path: ['imageBuffer'],
    })
  }

  if (payload.contentType === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Avatar content type is required',
      path: ['contentType'],
    })
  }
})

export type AccountFormValues = z.infer<typeof accountSchema>
export type UpdateProfileInputValues = z.infer<typeof updateProfileInputSchema>
