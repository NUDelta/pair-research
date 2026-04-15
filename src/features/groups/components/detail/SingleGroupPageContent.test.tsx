import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SingleGroupPageContent from './SingleGroupPageContent'

const {
  mockUseTaskRealtimeListener,
  mockShouldCelebratePairingActivation,
} = vi.hoisted(() => ({
  mockUseTaskRealtimeListener: vi.fn(),
  mockShouldCelebratePairingActivation: vi.fn(() => false),
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

vi.mock('@/features/groups/components/detail/GroupDetailHeader', () => ({

  default: ({ actions }: { actions?: ReactNode }) => (
    <div data-testid="group-detail-header">
      {actions}
    </div>
  ),
}))

vi.mock('@/features/groups/components/detail/TaskCard', () => ({

  default: () => <div data-testid="task-card">Task Card</div>,
}))

vi.mock('@/features/groups/components/detail/Pairing', () => ({

  default: () => <div data-testid="pairing-card">Current Pairing</div>,
}))

vi.mock('@/features/groups/components/detail/OthersTasks', () => ({

  default: () => <div data-testid="others-tasks">Others Tasks</div>,
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
        initialTasks={[
          {
            ...baseTask,
            id: 'task-other',
            userId: 'user-2',
            fullName: 'Grace Hopper',
          },
        ]}
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
          helpeeTaskId: 'task-other',
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
})
