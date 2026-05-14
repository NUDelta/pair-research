import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
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
    vi.mocked(toast.success).mockClear()
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
          description: 'Working draft',
        },
      },
    )

    expect(result.current.currentDescription).toBe('Working draft')

    rerender({ description: null as string | null })

    await waitFor(() => {
      expect(result.current.currentDescription).toBeNull()
    })
  })

  it('shares one group task channel across the current-user and others-task hooks', async () => {
    const initialTasks: Task[] = [
      {
        id: 'task-1',
        description: 'Initial task',
        userId: 'user-2',
        fullName: 'Teammate',
        avatarUrl: null,
        helpCapacity: null,
      },
    ]

    const { result, unmount } = renderHook(() => ({
      others: useTaskRealtimeListener('group-1', 'user-1', initialTasks),
      currentUser: useCurrentUserTaskDescription('group-1', 'user-1', null),
    }))

    expect(channel).toHaveBeenCalledTimes(1)
    expect(subscribe).toHaveBeenCalledTimes(1)
    expect(postgresHandlers).toHaveLength(1)

    const sharedHandler = postgresHandlers[0]
    expect(sharedHandler).toBeTypeOf('function')

    await sharedHandler({
      schema: 'public',
      table: 'task',
      eventType: 'UPDATE',
      commit_timestamp: '2026-04-13T10:00:00.000Z',
      errors: [],
      new: {
        id: 'task-2',
        description: 'Updated own task',
        user_id: 'user-1',
        group_id: 'group-1',
        created_at: '2026-04-13T10:00:00.000Z',
        pairing_id: null,
        delete_pending: false,
      },
      old: {},
    })

    await waitFor(() => {
      expect(result.current.currentUser.currentDescription).toBe('Updated own task')
    })
    expect(result.current.others.tasks).toEqual(initialTasks)

    unmount()
    expect(removeChannel).toHaveBeenCalledTimes(1)
  })

  it('removes a deleted task for other raters as soon as delete_pending is broadcast', async () => {
    const initialTasks: Task[] = [
      {
        id: '1',
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
        id: 1,
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

  it('invalidates the group route when a paired round is reset', async () => {
    renderHook(() =>
      useTaskRealtimeListener('group-1', 'user-1', []),
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
        id: 'task-2',
        description: 'Wrapped round task',
        user_id: 'user-2',
        group_id: 'group-1',
        created_at: '2026-04-13T10:00:00.000Z',
        pairing_id: 'pairing-1',
        delete_pending: true,
      },
      old: {
        id: 'task-2',
        pairing_id: 'pairing-1',
      },
    })

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledTimes(1)
    })
  })

  it('shows the pairing refresh toast only once per pairing id', async () => {
    const initialTasks: Task[] = [
      {
        id: 'task-1',
        description: 'Draft review',
        userId: 'user-2',
        fullName: 'Teammate one',
        avatarUrl: null,
        helpCapacity: 3,
      },
      {
        id: 'task-2',
        description: 'Methods section',
        userId: 'user-3',
        fullName: 'Teammate two',
        avatarUrl: null,
        helpCapacity: 4,
      },
    ]

    renderHook(() =>
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
        pairing_id: 'pairing-1',
        delete_pending: false,
      },
      old: {},
    })

    await taskHandler({
      schema: 'public',
      table: 'task',
      eventType: 'UPDATE',
      commit_timestamp: '2026-04-13T10:00:01.000Z',
      errors: [],
      new: {
        id: 'task-2',
        description: 'Methods section',
        user_id: 'user-3',
        group_id: 'group-1',
        created_at: '2026-04-13T10:00:01.000Z',
        pairing_id: 'pairing-1',
        delete_pending: false,
      },
      old: {},
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1)
      expect(toast.success).toHaveBeenCalledWith('Task paired with another user! Refreshing...')
      expect(invalidate).toHaveBeenCalledTimes(1)
    })
  })
})
