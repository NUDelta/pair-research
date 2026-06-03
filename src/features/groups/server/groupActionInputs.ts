import { z } from 'zod'

export const groupIdSchema = z.string().uuid('Group ID must be a valid UUID')

export const taskIdSchema = z.string().trim().min(1, 'Task ID is required')

export const groupIdInputSchema = z.object({
  groupId: groupIdSchema,
})

export const deleteTaskInputSchema = groupIdInputSchema.extend({
  taskId: taskIdSchema,
})

export const helpCapacityUpdateSchema = z.object({
  taskId: taskIdSchema,
  capacity: z.number().int('Capacity must be a whole number').min(1, 'Capacity must be at least 1').max(5, 'Capacity must be at most 5'),
})

export const upsertHelpCapacitiesInputSchema = groupIdInputSchema.extend({
  updates: z.array(helpCapacityUpdateSchema).min(1, 'Add at least one capacity update'),
})
