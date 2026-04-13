import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUserTaskDescription } from './useCurrentUserTaskDescription'
import { useTaskRealtimeListener } from './useTaskRealtimeListener'

const {
  removeChannel,
  invalidate,
  subscribe,
  on,
  channel,
  mockedUseRouter,
  from,
  postgresHandlers,
} = vi.hoisted(() => {
  const removeChannel = vi.fn()
  const invalidate = vi.fn()
  const subscribe = vi.fn(() => ({ unsubscribe: vi.fn() }))
  const postgresHandlers: Array<(payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => unknown> = []
  const on = vi.fn(function on(
    _event: string,
    _config: Record<string, unknown>,
    handler: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => unknown,
  ) {
    postgresHandlers.push(handler)
    return { on, subscribe }
  })
  const channel = vi.fn(() => ({ on, subscribe }))
  const mockedUseRouter = vi.fn(() => ({
    invalidate,
  }))
  const from = vi.fn(() => ({
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }))

  return {
    removeChannel,
    invalidate,
    subscribe,
    on,
    channel,
    mockedUseRouter,
    from,
    postgresHandlers,
  }
})

vi.mock('@/shared/supabase/client', () => ({
  createClient: () => ({
    channel,
    removeChannel,
    from,
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  useRouter: mockedUseRouter,
}))

describe('groups realtime hooks', () => {
  beforeEach(() => {
    channel.mockClear()
    on.mockClear()
    subscribe.mockClear()
    removeChannel.mockClear()
    invalidate.mockClear()
    mockedUseRouter.mockClear()
    from.mockClear()
    postgresHandlers.length = 0
  })

  it('syncs other tasks from refreshed loader data', async () => {
    const initialTasks: Task[] = [
      {
        id: 'task-1',
        description: 'Initial task',
        userId: 'user-2',
        fullName: 'Teammate',
        avatarUrl: null,
        helpCapacity: 3,
      },
    ]
    const updatedTasks: Task[] = [
      {
        id: 'task-2',
        description: 'Updated task',
        userId: 'user-3',
        fullName: 'Another teammate',
        avatarUrl: null,
        helpCapacity: 4,
      },
    ]

    const { result, rerender } = renderHook(
      ({ tasks }) => useTaskRealtimeListener('group-1', 'user-1', tasks),
      {
        initialProps: {
          tasks: initialTasks,
        },
      },
    )

    expect(result.current.tasks).toEqual(initialTasks)

    rerender({ tasks: updatedTasks })

    await waitFor(() => {
      expect(result.current.tasks).toEqual(updatedTasks)
    })
  })

  it('syncs the current task description when the loader data changes', async () => {
    const { result, rerender } = renderHook(
      ({ description }: { description: string | null }) =>
        useCurrentUserTaskDescription('group-1', 'user-1', description),
      {
        initialProps: {
          description: 'Working draft' as string | null,
        },
      },
    )

    expect(result.current.currentDescription).toBe('Working draft')

    rerender({ description: null as string | null })

    await waitFor(() => {
      expect(result.current.currentDescription).toBeNull()
    })
  })

  it('removes a deleted task for other raters as soon as delete_pending is broadcast', async () => {
    const initialTasks: Task[] = [
      {
        id: 'task-1',
        description: 'Draft review',
        userId: 'user-2',
        fullName: 'Teammate',
        avatarUrl: null,
        helpCapacity: 3,
      },
    ]

    const { result } = renderHook(() =>
      useTaskRealtimeListener('group-1', 'user-1', initialTasks),
    )

    const taskHandler = postgresHandlers[0]
    expect(taskHandler).toBeTypeOf('function')

    await taskHandler({
      schema: 'public',
      table: 'task',
      eventType: 'UPDATE',
      commit_timestamp: '2026-04-13T10:00:00.000Z',
      errors: [],
      new: {
        id: 'task-1',
        description: 'Draft review',
        user_id: 'user-2',
        group_id: 'group-1',
        created_at: '2026-04-13T10:00:00.000Z',
        pairing_id: null,
        delete_pending: true,
      },
      old: {},
    })

    await waitFor(() => {
      expect(result.current.tasks).toEqual([])
    })
  })
})
