import type { ReactNode } from 'react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MakePairsButton from './buttons/MakePairsButton'
import OthersTasksForm from './OthersTasksForm'

const {
  serverFnMock,
  mockedUseServerFn,
  invalidate,
  mockedUseRouter,
  mockedDoubleConfirmDialog,
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
}))

describe('groups detail controls', () => {
  beforeEach(() => {
    serverFnMock.mockReset()
    mockedUseServerFn.mockClear()
    invalidate.mockClear()
    mockedUseRouter.mockClear()
  })

  it('disables make pairs when fewer than two pool tasks are available', () => {
    render(<MakePairsButton groupId="group-1" eligibleTaskCount={0} />)

    expect(screen.getByRole('button', { name: 'Make Pairs' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Make Pairs' })).toHaveAttribute(
      'title',
      'The pool is empty. At least two active tasks are required to make pairs.',
    )
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
        groupId="group-1"
        tasks={[
          {
            id: 'task-1',
            description: 'Review draft intro',
            userId: 'user-2',
            fullName: 'Teammate',
            avatarUrl: null,
            helpCapacity: 2,
          },
        ]}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Submit Scores' })).not.toBeInTheDocument()

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
  })
})
