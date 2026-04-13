import { z } from 'zod'

const fullNameSchema = z
  .string()
  .nonempty('Name is required')
  .min(2, 'Name is required')
  .max(50, 'Name must be less than 50 characters')

export const accountSchema = z.object({
  full_name: fullNameSchema.optional(),
  avatar: z
    .instanceof(File)
    .or(z.custom<ArrayBuffer>())
    .optional(),
  content_type: z
    .string()
    .optional()
    .refine(
      (contentType) => {
        if (contentType === undefined) {
          return true
        }

        return contentType.startsWith('image/')
      },
      'Invalid type. Only images types are allowed.',
    ),
})

export type AccountFormValues = z.infer<typeof accountSchema>
