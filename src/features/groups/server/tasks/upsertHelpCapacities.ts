import { createServerFn } from '@tanstack/react-start'

export const upsertHelpCapacities = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (
      typeof data !== 'object'
      || data === null
      || !('groupId' in data)
      || !('updates' in data)
      || !Array.isArray(data.updates)
    ) {
      throw new Error('Group ID and updates are required')
    }

    return {
      groupId: String(data.groupId),
      updates: data.updates.map(update => ({
        taskId: String((update as { taskId: unknown }).taskId),
        capacity:
          typeof (update as { capacity?: unknown }).capacity === 'number'
            ? (update as { capacity: number }).capacity
            : undefined,
      })),
    }
  })
  .handler(async ({ data }): Promise<ActionResponse> => {
    try {
      const { getUser } = await import('@/shared/supabase/server')
      const validUpdates = data.updates.filter(
        update => update.capacity !== undefined && update.capacity >= 1 && update.capacity <= 5,
      )

      if (validUpdates.length === 0) {
        return {
          success: false,
          message: 'No valid capacities to update.',
        }
      }

      const user = await getUser()
      const { getGroupSession } = await import('@/shared/server/cloudflare/bindings.server')

      return await getGroupSession(data.groupId).upsertRatings({
        groupId: data.groupId,
        userId: user.id,
        updates: validUpdates.map(update => ({
          taskId: update.taskId,
          capacity: update.capacity as number,
        })),
      })
    }
    catch (error_) {
      console.error('Error upserting help capacities:', error_)
      return {
        success: false,
        message: 'Failed to upsert help capacities.',
      }
    }
  })
