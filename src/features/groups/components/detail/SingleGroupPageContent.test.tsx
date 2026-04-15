import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SingleGroupPageContent from './SingleGroupPageContent'

const {
  mockUseTaskRealtimeListener,
  mockShouldCelebratePairingActivation,
  mockFormatPairingRelativeTime,
  mockGroupDetailHeaderProps,
  mockOthersTasksProps,
  mockTaskCardProps,
  mockPairingProps,
} = vi.hoisted(() => ({
  mockUseTaskRealtimeListener: vi.fn(),
  mockShouldCelebratePairingActivation: vi.fn(() => false),
  mockFormatPairingRelativeTime: vi.fn(() => 'yesterday'),
  mockGroupDetailHeaderProps: vi.fn(),
  mockOthersTasksProps: vi.fn(),
  mockTaskCardProps: vi.fn(),
  mockPairingProps: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  // eslint-disable-next-line react/component-hook-factories
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('@/features/groups/hooks/useTaskRealtimeListener', () => ({
  useTaskRealtimeListener: mockUseTaskRealtimeListener,
}))

vi.mock('@/features/groups/hooks/useRatingProgressRealtimeRefresh', () => ({
  useRatingProgressRealtimeRefresh: vi.fn(),
}))

vi.mock('@/features/groups/lib/pairingCelebration', () => ({
  shouldCelebratePairingActivation: mockShouldCelebratePairingActivation,
}))

vi.mock('@/features/groups/components/detail/roundStatus', () => ({
  formatPairingRelativeTime: mockFormatPairingRelativeTime,
}))

vi.mock('@/features/groups/components/detail/GroupDetailHeader', () => ({

  default: (props: {
    actions?: ReactNode
    roundStatusLabel?: string
    roundStatusNote?: string | null
  }) => {
    mockGroupDetailHeaderProps(props)

    return (
      <div data-testid="group-detail-header">
        <span>{props.roundStatusLabel}</span>
        <span>{props.roundStatusNote}</span>
        {props.actions}
      </div>
    )
  },
}))

vi.mock('@/features/groups/components/detail/TaskCard', () => ({

  default: (props: unknown) => {
    mockTaskCardProps(props)
    return <div data-testid="task-card">Task Card</div>
  },
}))

vi.mock('@/features/groups/components/detail/Pairing', () => ({

  default: (props: unknown) => {
    mockPairingProps(props)
    return <div data-testid="pairing-card">Current Pairing</div>
  },
}))

vi.mock('@/features/groups/components/detail/OthersTasks', () => ({

  default: (props: unknown) => {
    mockOthersTasksProps(props)
    return <div data-testid="others-tasks">Others Tasks</div>
  },
}))

vi.mock('@/features/groups/components/detail/SoloRoundNotice', () => ({

  default: () => <div data-testid="solo-round-notice">Solo Round</div>,
}))

vi.mock('@/features/groups/components/detail/PairingSuccessConfetti', () => ({
  default: () => null,
}))

vi.mock('@/features/groups/components/detail/buttons', () => ({
  // eslint-disable-next-line react/component-hook-factories
  LeavePoolButton: () => <button type="button">Leave Pool</button>,
  // eslint-disable-next-line react/component-hook-factories
  MakePairsButton: () => <button type="button">Make Pairs</button>,
  // eslint-disable-next-line react/component-hook-factories
  ResetPoolButton: () => <button type="button">Reset Pool</button>,
}))

const baseTask: Task = {
  id: 'task-self',
  description: 'Draft my methods section',
  userId: 'user-1',
  fullName: 'Ada Lovelace',
  avatarUrl: null,
  helpCapacity: null,
  ratingsCompletedCount: 0,
  ratingsCompletionOrder: null,
}

const teammateTask: Task = {
  id: 'task-2',
  description: 'Review figures',
  userId: 'user-2',
  fullName: 'Grace Hopper',
  avatarUrl: null,
  helpCapacity: 4,
  ratingsCompletedCount: 1,
  ratingsCompletionOrder: 3,
}

const baseProps = {
  groupInfo: {
    id: 'group-1',
    name: 'Research Circle',
    activePairingId: null,
    activePairingCreatedAt: null,
    activePairCount: 0,
    lastPairingCreatedAt: null,
    userId: 'user-1',
    fullName: 'Ada Lovelace',
    avatarUrl: null,
    isAdmin: true,
    hasActivePairing: false,
  },
  initialTasks: [baseTask],
  currentUserActivePairingTaskWithProfile: null,
} satisfies Parameters<typeof SingleGroupPageContent>[0]

describe('singleGroupPageContent', () => {
  beforeEach(() => {
    mockUseTaskRealtimeListener.mockImplementation((_groupId: string, _userId: string, tasks: Task[]) => ({
      tasks,
    }))
    mockShouldCelebratePairingActivation.mockReturnValue(false)
    mockFormatPairingRelativeTime.mockReturnValue('yesterday')
    mockGroupDetailHeaderProps.mockClear()
    mockOthersTasksProps.mockClear()
    mockTaskCardProps.mockClear()
    mockPairingProps.mockClear()
  })

  it('hides the current user task card while an active pairing is shown', () => {
    render(
      <SingleGroupPageContent
        {...baseProps}
        groupInfo={{
          ...baseProps.groupInfo,
          activePairingId: 'pairing-1',
          activePairingCreatedAt: '2026-04-14T12:00:00.000Z',
          activePairCount: 1,
          hasActivePairing: true,
        }}
        initialTasks={[teammateTask]}
        currentUserActivePairingTaskWithProfile={{
          id: 'pairing-1',
          helperId: 'user-1',
          helperFullName: 'Ada Lovelace',
          helperAvatarUrl: null,
          helperTaskId: 'task-self',
          helperTaskDescription: 'Draft my methods section',
          helpeeId: 'user-2',
          helpeeFullName: 'Grace Hopper',
          helpeeAvatarUrl: null,
          helpeeTaskId: 'task-2',
          helpeeTaskDescription: 'Review figures',
        }}
      />,
    )

    expect(screen.getByTestId('pairing-card')).toBeInTheDocument()
    expect(screen.queryByTestId('task-card')).not.toBeInTheDocument()
  })

  it('keeps the current user task card visible when no pairing is active', () => {
    render(<SingleGroupPageContent {...baseProps} />)

    expect(screen.getByTestId('task-card')).toBeInTheDocument()
    expect(screen.queryByTestId('pairing-card')).not.toBeInTheDocument()
  })

  it('passes active round header state to the header component', () => {
    render(
      <SingleGroupPageContent
        {...baseProps}
        groupInfo={{
          ...baseProps.groupInfo,
          activePairingId: 'pairing-1',
          activePairingCreatedAt: '2026-04-14T12:00:00.000Z',
          activePairCount: 1,
          hasActivePairing: true,
        }}
      />,
    )

    expect(mockGroupDetailHeaderProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        roundStatusLabel: 'Active round',
        roundStatusNote: 'This pairing was made yesterday.',
      }),
    )
  })

  it('passes the last pairing note when the round is idle but history exists', () => {
    render(
      <SingleGroupPageContent
        {...baseProps}
        groupInfo={{
          ...baseProps.groupInfo,
          lastPairingCreatedAt: '2026-04-08T12:00:00.000Z',
        }}
      />,
    )

    expect(mockGroupDetailHeaderProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        roundStatusLabel: undefined,
        roundStatusNote: 'Last pairing was made yesterday.',
      }),
    )
  })

  it('omits the round note when there is no pairing history', () => {
    render(<SingleGroupPageContent {...baseProps} />)

    expect(mockGroupDetailHeaderProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        roundStatusLabel: undefined,
        roundStatusNote: null,
      }),
    )
  })

  it('passes admin active-round summary props when the current user is left out', () => {
    render(
      <SingleGroupPageContent
        {...baseProps}
        groupInfo={{
          ...baseProps.groupInfo,
          activePairingId: 'pairing-1',
          activePairingCreatedAt: '2026-04-14T12:00:00.000Z',
          activePairCount: 2,
          hasActivePairing: true,
        }}
        initialTasks={[baseTask, teammateTask]}
      />,
    )

    expect(screen.getByTestId('solo-round-notice')).toBeInTheDocument()
    expect(mockOthersTasksProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activePairCount: 2,
        currentUserHasTask: true,
        currentUserInPool: true,
        currentUserLeftOut: true,
        hasActivePairing: true,
        isAdmin: true,
        tasks: [
          expect.objectContaining({
            userId: 'user-2',
          }),
        ],
      }),
    )
  })

  it('keeps admin-only actions out of the header for non-admin members', () => {
    render(
      <SingleGroupPageContent
        {...baseProps}
        groupInfo={{
          ...baseProps.groupInfo,
          isAdmin: false,
        }}
        initialTasks={[teammateTask]}
        currentUserActivePairingTaskWithProfile={{
          id: 'pairing-1',
          helperId: 'user-1',
          helperFullName: 'Ada Lovelace',
          helperAvatarUrl: null,
          helperTaskId: 'task-self',
          helperTaskDescription: 'Draft my methods section',
          helpeeId: 'user-2',
          helpeeFullName: 'Grace Hopper',
          helpeeAvatarUrl: null,
          helpeeTaskId: 'task-2',
          helpeeTaskDescription: 'Review figures',
        }}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Reset Pool' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Make Pairs' })).not.toBeInTheDocument()
    expect(screen.queryByText('Settings')).not.toBeInTheDocument()
    expect(mockOthersTasksProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentUserHasTask: true,
        currentUserInPool: false,
        isAdmin: false,
      }),
    )
  })

  it('treats a member with no saved task as not in the pool', () => {
    render(
      <SingleGroupPageContent
        {...baseProps}
        initialTasks={[teammateTask]}
      />,
    )

    expect(mockTaskCardProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        poolStatus: 'not-in-pool',
      }),
    )
    expect(mockOthersTasksProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentUserHasTask: false,
        currentUserInPool: false,
        tasks: [
          expect.objectContaining({
            userId: 'user-2',
          }),
        ],
      }),
    )
  })

  it('passes other members to the others-tasks section during rating rounds', () => {
    render(
      <SingleGroupPageContent
        {...baseProps}
        initialTasks={[baseTask, teammateTask]}
      />,
    )

    expect(mockOthersTasksProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currentUserHasTask: true,
        currentUserInPool: true,
        raceTasks: [
          expect.objectContaining({ userId: 'user-1' }),
          expect.objectContaining({ userId: 'user-2' }),
        ],
        tasks: [
          expect.objectContaining({
            userId: 'user-2',
          }),
        ],
      }),
    )
  })
})
