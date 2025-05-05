import { z } from 'zod'

export const taskSchema = z.object({
  description: z
    .string()
    .nonempty('Task description is required')
    .min(5, 'Task description must be at least 5 characters')
    .max(150, 'Task description must be at most 150 characters'),
})

export type TaskValues = z.infer<typeof taskSchema>
