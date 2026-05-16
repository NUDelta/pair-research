import type { GroupSessionEvent } from '@/features/groups/lib/groupSessionEvents'
import { renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentUserTaskDescription } from './useCurrentUserTaskDescription'
import { useTaskRealtimeListener } from './useTaskRealtimeListener'

const {
  invalidate,
  mockedUseRouter,
  mockedUseServerFn,
  subscribeToGroupTaskChanges,
  groupSessionHandlers,
} = vi.hoisted(() => {
  const invalidate = vi.fn()
  const mockedUseRouter = vi.fn(() => ({
    invalidate,
  }))
  const mockedUseServerFn = vi.fn(() => vi.fn(async () => ({ success: true, token: 'token' })))
  const groupSessionHandlers: Array<(event: GroupSessionEvent) => unknown> = []
  const subscribeToGroupTaskChanges = vi.fn((
    _groupId: string,
    _getToken: () => Promise<string | null>,
    handler: (event: GroupSessionEvent) => unknown,
  ) => {
    groupSessionHandlers.push(handler)
    return vi.fn()
  })

  return {
    invalidate,
    mockedUseRouter,
    mockedUseServerFn,
    subscribeToGroupTaskChanges,
    groupSessionHandlers,
  }
})

vi.mock('@tanstack/react-router', () => ({
  useRouter: mockedUseRouter,
}))

vi.mock('@tanstack/react-start', () => ({
  useServerFn: mockedUseServerFn,
}))

vi.mock('@/features/groups/server/groupSessionToken', () => ({
  createGroupSessionToken: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock('./subscribeToGroupTaskChanges', () => ({
  subscribeToGroupTaskChanges,
}))

describe('groups realtime hooks', () => {
  beforeEach(() => {
    invalidate.mockClear()
    mockedUseRouter.mockClear()
    mockedUseServerFn.mockClear()
    subscribeToGroupTaskChanges.mockClear()
    groupSessionHandlers.length = 0
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

  it('shares the group session subscription between current-user and others-task hooks', () => {
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

    const { unmount } = renderHook(() => ({
      others: useTaskRealtimeListener('group-1', 'user-1', initialTasks),
      currentUser: useCurrentUserTaskDescription('group-1', 'user-1', null),
    }))

    expect(subscribeToGroupTaskChanges).toHaveBeenCalledTimes(2)
    expect(groupSessionHandlers).toHaveLength(2)

    unmount()
  })

  it('applies group session snapshots to local task state', async () => {
    const initialTasks: Task[] = []
    const { result } = renderHook(() =>
      useTaskRealtimeListener('group-1', 'user-1', initialTasks),
    )

    await groupSessionHandlers[0]({
      type: 'snapshot',
      tasks: [
        {
          id: 'task-2',
          description: 'Updated task',
          userId: 'user-2',
          fullName: 'Teammate',
          avatarUrl: null,
          helpCapacity: 5,
          ratingsCompletedCount: 1,
          ratingsCompletionOrder: 7,
        },
      ],
    })

    await waitFor(() => {
      expect(result.current.tasks).toEqual([
        {
          id: 'task-2',
          description: 'Updated task',
          userId: 'user-2',
          fullName: 'Teammate',
          avatarUrl: null,
          helpCapacity: 5,
          ratingsCompletedCount: 1,
          ratingsCompletionOrder: 7,
        },
      ])
    })
  })

  it('removes a deleted task for other raters', async () => {
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

    await groupSessionHandlers[0]({
      type: 'task:deleted',
      taskId: '1',
      userId: 'user-2',
    })

    await waitFor(() => {
      expect(result.current.tasks).toEqual([])
    })
  })

  it('invalidates the group route once for a created pairing', async () => {
    const initialTasks: Task[] = []
    renderHook(() =>
      useTaskRealtimeListener('group-1', 'user-1', initialTasks),
    )

    await groupSessionHandlers[0]({
      type: 'pairing:created',
      pairingId: 'pairing-1',
    })
    await groupSessionHandlers[0]({
      type: 'pairing:created',
      pairingId: 'pairing-1',
    })

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledTimes(1)
      expect(toast.success).toHaveBeenCalledWith('Pairs were created. Refreshing...')
      expect(invalidate).toHaveBeenCalledTimes(1)
    })
  })
})
