import { z } from 'zod'
import { groupIdSchema } from '@/features/groups/schemas/groupManagement'

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
  updates: z.array(helpCapacityUpdateSchema)
    .min(1, 'Add at least one capacity update')
    .max(100, 'Update at most 100 capacities at a time')
    .refine(
      updates => new Set(updates.map(update => update.taskId)).size === updates.length,
      'Each task can only be updated once per request',
    ),
})
