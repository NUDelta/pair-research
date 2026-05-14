import type { ReactNode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MakePairsButton from './buttons/MakePairsButton'
import ResetPoolButton from './buttons/ResetPoolButton'
import OthersTasksForm from './OthersTasksForm'
import TaskEditor from './TaskCard/TaskEditor'

const {
  serverFnMock,
  mockedUseServerFn,
  invalidate,
  mockedUseRouter,
  mockedDoubleConfirmDialog,
  mockedToast,
} = vi.hoisted(() => {
  const serverFnMock = vi.fn()
  const mockedUseServerFn = vi.fn(() => serverFnMock)
  const invalidate = vi.fn()
  const mockedUseRouter = vi.fn(() => ({
    invalidate,
  }))
  const mockedDoubleConfirmDialog = ({ trigger }: { trigger: ReactNode }) => <>{trigger}</>

  return {
    serverFnMock,
    mockedUseServerFn,
    invalidate,
    mockedUseRouter,
    mockedDoubleConfirmDialog,
    mockedToast: {
      error: vi.fn(),
      success: vi.fn(),
    },
  }
})

vi.mock('@tanstack/react-start', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-start')>('@tanstack/react-start')

  return {
    ...actual,
    useServerFn: mockedUseServerFn,
  }
})

vi.mock('@tanstack/react-router', () => ({
  useRouter: mockedUseRouter,
}))

vi.mock('@/shared/ui', () => ({
  DoubleConfirmDialog: mockedDoubleConfirmDialog,
  Spinner: ({ text }: { text?: string }) => <span>{text}</span>,
}))

vi.mock('sonner', () => ({
  toast: mockedToast,
}))

vi.mock('@/features/groups/hooks/useCurrentUserTaskDescription', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    useCurrentUserTaskDescription: (
      _groupId: string,
      _currentUserId: string,
      initialDescription?: string | null,
    ) => {
      const [currentDescription, setCurrentDescription] = React.useState(initialDescription ?? null)

      return { currentDescription, setCurrentDescription }
    },
  }
})

describe('groups detail controls', () => {
  beforeEach(() => {
    serverFnMock.mockReset()
    mockedUseServerFn.mockClear()
    invalidate.mockClear()
    mockedUseRouter.mockClear()
    mockedToast.error.mockClear()
    mockedToast.success.mockClear()
  })

  it('disables make pairs when fewer than two pool tasks are available', () => {
    render(<MakePairsButton groupId="group-1" eligibleTaskCount={0} />)

    expect(screen.getByRole('button', { name: 'Make Pairs' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Make Pairs' })).toHaveAttribute(
      'title',
      'The pool is empty. At least two active tasks are required to make pairs.',
    )
  })

  it('keeps make pairs available when some ratings are still missing', () => {
    render(<MakePairsButton groupId="group-1" eligibleTaskCount={3} />)

    expect(screen.getByRole('button', { name: 'Make Pairs' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Make Pairs' })).not.toHaveAttribute('title')
  })

  it('keeps reset pool available for admins via confirmation dialog', () => {
    render(<ResetPoolButton groupId="group-1" />)

    expect(screen.getByRole('button', { name: 'Reset Pool' })).toBeEnabled()
  })

  it('autosaves rating changes immediately and queues rapid updates for the same task', async () => {
    const user = userEvent.setup()
    let resolveFirst: ((value: ActionResponse) => void) | undefined
    let resolveSecond: ((value: ActionResponse) => void) | undefined

    serverFnMock
      .mockImplementationOnce(async () =>
        new Promise<ActionResponse>((resolve) => {
          resolveFirst = resolve
        }))
      .mockImplementationOnce(async () =>
        new Promise<ActionResponse>((resolve) => {
          resolveSecond = resolve
        }))

    render(
      <OthersTasksForm
        currentUserId="user-1"
        groupId="group-1"
        raceTasks={[
          {
            id: 'task-self',
            description: 'My draft',
            userId: 'user-1',
            fullName: 'Me',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
          {
            id: 'task-1',
            description: 'Review draft intro',
            userId: 'user-2',
            fullName: 'Teammate',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
        ]}
        canRate
        tasks={[
          {
            id: 'task-1',
            description: 'Review draft intro',
            userId: 'user-2',
            fullName: 'Teammate',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
        ]}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Submit Scores' })).not.toBeInTheDocument()
    expect(screen.getByText('Needs your rating')).toBeInTheDocument()
    expect(screen.getByText('0 of 2 members finished rating')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rate 3' }))

    expect(serverFnMock).toHaveBeenCalledTimes(1)
    expect(serverFnMock).toHaveBeenNthCalledWith(1, {
      data: {
        groupId: 'group-1',
        updates: [{ taskId: 'task-1', capacity: 3 }],
      },
    })
    expect(screen.getByText('Saving rating...')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rate 5' }))

    expect(serverFnMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst?.({ success: true, message: 'saved' })
    })

    await waitFor(() => {
      expect(serverFnMock).toHaveBeenCalledTimes(2)
    })
    expect(serverFnMock).toHaveBeenNthCalledWith(2, {
      data: {
        groupId: 'group-1',
        updates: [{ taskId: 'task-1', capacity: 5 }],
      },
    })

    await act(async () => {
      resolveSecond?.({ success: true, message: 'saved' })
    })

    await waitFor(() => {
      expect(screen.queryByText('Saving rating...')).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Rate 5' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('Needs your rating')).not.toBeInTheDocument()
    expect(screen.getByText('How much can you help with each of these tasks?')).toBeInTheDocument()
    expect(screen.getByText('(1: not at all, 5: totally)')).toBeInTheDocument()
  })

  it('optimistically updates task text and queues rapid edits', async () => {
    const user = userEvent.setup()
    let resolveFirst: ((value: ActionResponse) => void) | undefined
    let resolveSecond: ((value: ActionResponse) => void) | undefined

    serverFnMock
      .mockImplementationOnce(async () =>
        new Promise<ActionResponse>((resolve) => {
          resolveFirst = resolve
        }))
      .mockImplementationOnce(async () =>
        new Promise<ActionResponse>((resolve) => {
          resolveSecond = resolve
        }))

    render(
      <TaskEditor
        currentUserId="user-1"
        groupId="group-1"
        initialDescription="Original task"
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Edit Task' }))
    await user.clear(screen.getByRole('textbox', { name: 'Edit your task' }))
    await user.type(screen.getByRole('textbox', { name: 'Edit your task' }), 'Updated task')
    await user.click(screen.getByRole('button', { name: 'Update' }))

    expect(screen.getByText('Updated task')).toBeInTheDocument()
    expect(screen.getByText('Saving...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit Task' })).toBeEnabled()
    expect(serverFnMock).toHaveBeenCalledTimes(1)
    expect(serverFnMock).toHaveBeenNthCalledWith(1, {
      data: {
        groupId: 'group-1',
        description: 'Updated task',
      },
    })

    await user.click(screen.getByRole('button', { name: 'Edit Task' }))
    await user.clear(screen.getByRole('textbox', { name: 'Edit your task' }))
    await user.type(screen.getByRole('textbox', { name: 'Edit your task' }), 'Queued task')
    await user.click(screen.getByRole('button', { name: 'Update' }))

    expect(screen.getByText('Queued task')).toBeInTheDocument()
    expect(serverFnMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveFirst?.({ success: true, message: 'saved' })
    })

    await waitFor(() => {
      expect(serverFnMock).toHaveBeenCalledTimes(2)
    })
    expect(serverFnMock).toHaveBeenNthCalledWith(2, {
      data: {
        groupId: 'group-1',
        description: 'Queued task',
      },
    })

    await act(async () => {
      resolveSecond?.({ success: true, message: 'saved' })
    })

    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument()
    })
    expect(screen.getByText('Queued task')).toBeInTheDocument()
  })

  it('hides rating controls for users who are not currently in the pool', () => {
    render(
      <OthersTasksForm
        currentUserId="user-1"
        groupId="group-1"
        raceTasks={[
          {
            id: 'task-1',
            description: 'Review draft intro',
            userId: 'user-2',
            fullName: 'Teammate',
            avatarUrl: null,
            helpCapacity: 2,
            ratingsCompletedCount: 0,
          },
        ]}
        canRate={false}
        tasks={[
          {
            id: 'task-1',
            description: 'Review draft intro',
            userId: 'user-2',
            fullName: 'Teammate',
            avatarUrl: null,
            helpCapacity: 2,
            ratingsCompletedCount: 0,
          },
        ]}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Rate 3' })).not.toBeInTheDocument()
    expect(screen.queryByText('Needs your rating')).not.toBeInTheDocument()
    expect(screen.getByText('Join the pool to unlock ratings. Only members with an active task in the current pool can rate others.')).toBeInTheDocument()
  })

  it('renders the horse race below the others task list', () => {
    render(
      <OthersTasksForm
        currentUserId="user-1"
        groupId="group-1"
        raceTasks={[
          {
            id: 'task-self',
            description: 'My draft',
            userId: 'user-1',
            fullName: 'Me',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
          {
            id: 'task-1',
            description: 'Review draft intro',
            userId: 'user-2',
            fullName: 'Teammate',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
        ]}
        canRate
        tasks={[
          {
            id: 'task-1',
            description: 'Review draft intro',
            userId: 'user-2',
            fullName: 'Teammate',
            avatarUrl: null,
            helpCapacity: null,
            ratingsCompletedCount: 0,
          },
        ]}
      />,
    )

    const othersHeading = screen.getByText('Others Currently In the Pool')
    const horseRaceHeading = screen.getByText('Horse race')

    expect(othersHeading.compareDocumentPosition(horseRaceHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
